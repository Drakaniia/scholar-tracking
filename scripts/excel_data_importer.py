#!/usr/bin/env python3
"""
Excel Data Import Script for Scholarship Tracking System

This script reads data from Excel files (internal and external scholarship data)
and imports them into the PostgreSQL database via API calls or direct database operations.

Author: AI Assistant
Created: 2026-06-17
Academic Year: 2024-2025
"""

import os
import sys
import json
import random
import string
import io
import pandas as pd
from datetime import datetime, date
from typing import Dict, List, Optional, Any
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from decimal import Decimal
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# ---------------------------------------------------------------------------
# Windows console encoding fix
# ---------------------------------------------------------------------------
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
try:
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# Emoji → ASCII fallback map (used when the stream can't handle Unicode)
_EMOJI_MAP = {
    '\u2705': '[OK]',          # ✅
    '\u274c': '[ERROR]',       # ❌
    '\u26a0\ufe0f': '[WARN]',  # ⚠️
    '\u26a0': '[WARN]',
    '\U0001f4ca': '[DATA]',    # 📊
    '\U0001f4c4': '[SHEET]',   # 📄
    '\U0001f4c1': '[FOLDER]',  # 📁
    '\U0001f4cb': '[CLIP]',    # 📋
    '\U0001f3af': '[GOAL]',    # 🎯
    '\U0001f3eb': '[SCHOOL]',  # 🏫
    '\U0001f4b0': '[MONEY]',   # 💰
    '\U0001f4b5': '[CASH]',    # 💵
    '\U0001f9fe': '[CASSETTE]',# 🧾
    '\U0001f389': ['DONE'],    # 🎉
    '\U0001f50d': '[SEARCH]',  # 🔍
    '\U0001f4a1': '[IDEA]',    # 💡
    '\U0001f6a7': '[BLOCK]',   # 🚧
    '\U0001f534': '[RED]',     # 🔴
    '\U0001f7e2': '[GREEN]',   # 🟢
    '\U0001f504': '[REFRESH]', # 🔄
    '\u231b': '[WAIT]',        # ⌛
    '\u2139\ufe0f': '[INFO]',  # ℹ️
    '\u2139': '[INFO]',
}


def sprint(*args, **kwargs):
    """Print with emoji-to-ASCII fallback for consoles that
    cannot render Unicode (e.g. Windows cmd with default charset)."""
    try:
        # Test if the current stdout can handle Unicode at all
        ''.encode(encoding=sys.stdout.encoding or 'utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Fallback – replace emoji in the joined string
        text = ' '.join(str(a) for a in args)
        for emoji, ascii_repl in _EMOJI_MAP.items():
            text = text.replace(emoji, ascii_repl)
        # Remove any remaining non-ASCII characters
        text = text.encode('ascii', errors='replace').decode('ascii')
        print(text, **kwargs)
        return
    print(*args, **kwargs)

class ScholarshipDataImporter:
    def __init__(self, 
                 database_url: Optional[str] = None,
                 api_base_url: str = "http://localhost:3000/api",
                 dry_run: bool = True):
        """
        Initialize the importer
        
        Args:
            database_url: PostgreSQL connection string
            api_base_url: Base URL for API endpoints
            dry_run: If True, only show what would be imported without actual import
        """
        # Use DIRECT_DATABASE_URL for direct connection, fallback to DATABASE_URL
        self.database_url = database_url or os.getenv('DIRECT_DATABASE_URL') or os.getenv('DATABASE_URL')
        self.api_base_url = api_base_url
        self.dry_run = dry_run
        self.session = requests.Session()
        self.db_conn = None
        
        # Configure for 2025-2026 academic year
        self.academic_year = "2025-2026"
        self.academic_year_id = None
        
        # Statistics
        self.stats = {
            'students_processed': 0,
            'students_created': 0,
            'students_updated': 0,
            'scholarships_processed': 0,
            'scholarships_created': 0,
            'student_scholarships_created': 0,
            'errors': []
        }
        
    def connect_database(self):
        """Establish database connection"""
        if self.dry_run:
            return None
        
        if not self.database_url:
            raise ValueError("DIRECT_DATABASE_URL or DATABASE_URL is required for live import mode")
        
        try:
            # Parse connection URL
            db_url = self.database_url
            
            # Handle Prisma Accelerate URL format if DATABASE_URL is used instead of DIRECT_DATABASE_URL
            if db_url.startswith('prisma+postgres://'):
                sprint("⚠️  Warning: Using Prisma Accelerate URL. Recommend using DIRECT_DATABASE_URL instead.")
                db_url = db_url.replace('prisma+postgres://', 'postgresql://')
                # Remove query parameters that psycopg2 doesn't understand
                if '?' in db_url:
                    db_url = db_url.split('?')[0]
            
            # Handle standard postgres:// format (convert to postgresql://)
            elif db_url.startswith('postgres://'):
                db_url = db_url.replace('postgres://', 'postgresql://')
            
            sprint(f"🔌 Connecting to database...")
            sprint(f"   Using: {'DIRECT_DATABASE_URL' if 'DIRECT_DATABASE_URL' in os.environ and self.database_url == os.getenv('DIRECT_DATABASE_URL') else 'DATABASE_URL'}")
            
            self.db_conn = psycopg2.connect(db_url)
            self.db_conn.autocommit = False  # Use transactions
            sprint("✅ Database connection established")
            return self.db_conn
        except Exception as e:
            sprint(f"❌ Database connection failed: {str(e)}")
            sprint(f"   Connection string starts with: {self.database_url[:20]}...")
            raise
    
    def close_database(self):
        """Close database connection"""
        if self.db_conn:
            self.db_conn.close()
            sprint("Database connection closed")
    
    def create_student_in_db(self, student_data: Dict[str, Any]) -> Optional[int]:
        """
        Create student record in database
        
        Returns:
            Student ID if successful, None otherwise
        """
        if not self.db_conn:
            return None
        
        try:
            cursor = self.db_conn.cursor()
            
            # Check if student exists (by name combination)
            # Note: Table name is 'students' (lowercase) due to @@ map directive
            cursor.execute("""
                SELECT student_id FROM students 
                WHERE first_name = %s AND last_name = %s AND middle_initial = %s
                LIMIT 1
            """, (student_data['firstName'], student_data['lastName'], student_data['middleInitial']))
            
            existing = cursor.fetchone()
            if existing:
                return existing[0]
            
            # Insert new student
            cursor.execute("""
                INSERT INTO students (
                    first_name, last_name, middle_initial, program, 
                    year_level, grade_level, status, graduation_status,
                    term_type, birth_date, is_archived, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                ) RETURNING student_id
            """, (
                student_data['firstName'],
                student_data['lastName'],
                student_data['middleInitial'],
                student_data['program'],
                student_data['yearLevel'],
                student_data['gradeLevel'],
                student_data['status'],
                student_data['graduationStatus'],
                student_data['termType'],
                student_data['birthDate'],
                student_data['isArchived']
            ))
            
            student_id = cursor.fetchone()[0]
            self.stats['students_created'] += 1
            return student_id
            
        except Exception as e:
            sprint(f"❌ Error creating student: {str(e)}")
            self.stats['errors'].append(f"Create student: {str(e)}")
            return None
    
    def create_scholarship_in_db(self, scholarship_data: Dict[str, Any]) -> Optional[int]:
        """
        Create or get scholarship record in database
        
        Returns:
            Scholarship ID if successful, None otherwise
        """
        if not self.db_conn:
            return None
        
        try:
            cursor = self.db_conn.cursor()
            
            # Check if scholarship exists (by name and type)
            cursor.execute("""
                SELECT scholarship_id FROM scholarships 
                WHERE scholarship_name = %s AND type = %s
                LIMIT 1
            """, (scholarship_data['scholarshipName'], scholarship_data['type']))
            
            existing = cursor.fetchone()
            if existing:
                return existing[0]
            
            # Insert new scholarship
            cursor.execute("""
                INSERT INTO scholarships (
                    scholarship_name, type, sponsor, amount, source,
                    status, grant_type, eligible_grade_levels, eligible_programs,
                    covered_terms, covers_tuition, covers_miscellaneous,
                    covers_laboratory, covers_other, tuition_fee,
                    miscellaneous_fee, laboratory_fee, other_fee,
                    amount_subsidy, percent_subsidy, requirements,
                    academic_year_id, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                ) RETURNING scholarship_id
            """, (
                scholarship_data['scholarshipName'],
                scholarship_data['type'],
                scholarship_data['sponsor'],
                scholarship_data['amount'],
                scholarship_data['source'],
                scholarship_data['status'],
                scholarship_data['grantType'],
                scholarship_data['eligibleGradeLevels'],
                scholarship_data['eligiblePrograms'],
                scholarship_data['coveredTerms'],
                scholarship_data['coversTuition'],
                scholarship_data['coversMiscellaneous'],
                scholarship_data['coversLaboratory'],
                scholarship_data['coversOther'],
                scholarship_data['tuitionFee'],
                scholarship_data['miscellaneousFee'],
                scholarship_data['laboratoryFee'],
                scholarship_data['otherFee'],
                scholarship_data['amountSubsidy'],
                scholarship_data['percentSubsidy'],
                scholarship_data['requirements'],
                scholarship_data['academicYearId']
            ))
            
            scholarship_id = cursor.fetchone()[0]
            self.stats['scholarships_created'] += 1
            return scholarship_id
            
        except Exception as e:
            sprint(f"❌ Error creating scholarship: {str(e)}")
            self.stats['errors'].append(f"Create scholarship: {str(e)}")
            return None
    
    def link_student_scholarship(self, student_id: int, scholarship_id: int) -> bool:
        """
        Create student-scholarship link in database
        
        Returns:
            True if successful, False otherwise
        """
        if not self.db_conn:
            return False
        
        try:
            cursor = self.db_conn.cursor()
            
            # Check if link exists
            cursor.execute("""
                SELECT student_scholarship_id FROM student_scholarships 
                WHERE student_id = %s AND scholarship_id = %s
                LIMIT 1
            """, (student_id, scholarship_id))
            
            if cursor.fetchone():
                return True  # Already linked
            
            # Create link
            cursor.execute("""
                INSERT INTO student_scholarships (
                    student_id, scholarship_id, scholarship_status, grant_amount, award_date, start_term, end_term, created_at, updated_at
                ) VALUES (
                    %s, %s, 'Active', 0, NOW(), '1ST', '2ND', NOW(), NOW()
                )
            """, (student_id, scholarship_id))
            
            self.stats['student_scholarships_created'] += 1
            return True
            
        except Exception as e:
            sprint(f"❌ Error linking student-scholarship: {str(e)}")
            self.stats['errors'].append(f"Link student-scholarship: {str(e)}")
            return False
        
    def generate_random_name(self) -> Dict[str, str]:
        """Generate random Filipino-style names for anonymization"""
        first_names = [
            'Maria', 'Juan', 'Ana', 'Pedro', 'Rosa', 'Jose', 'Carmen', 'Miguel',
            'Luz', 'Antonio', 'Elena', 'Carlos', 'Sofia', 'Luis', 'Isabella',
            'Fernando', 'Cristina', 'Ricardo', 'Camila', 'Diego', 'Valentina',
            'Santiago', 'Andrea', 'Gabriel', 'Lucia', 'Rafael', 'Adriana'
        ]
        
        last_names = [
            'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza',
            'Torres', 'Gonzalez', 'Rodriguez', 'Perez', 'Sanchez', 'Ramirez',
            'Flores', 'Rivera', 'Gomez', 'Diaz', 'Morales', 'Jimenez', 'Herrera',
            'Medina', 'Castro', 'Vargas', 'Ramos', 'Gutierrez', 'Ortiz', 'Chavez'
        ]
        
        middle_initials = list(string.ascii_uppercase)
        
        return {
            'firstName': random.choice(first_names),
            'lastName': random.choice(last_names),
            'middleInitial': random.choice(middle_initials)
        }
    
    def analyze_excel_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze Excel file structure and content
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            Dictionary with file analysis
        """
        try:
            # Read all sheets
            excel_file = pd.ExcelFile(file_path)
            analysis = {
                'file_path': file_path,
                'sheets': [],
                'total_rows': 0,
                'columns_summary': {}
            }
            
            sprint(f"\n📊 Analyzing Excel file: {file_path}")
            sprint(f"📋 Available sheets: {excel_file.sheet_names}")
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                sheet_analysis = {
                    'name': sheet_name,
                    'rows': len(df),
                    'columns': list(df.columns),
                    'sample_data': df.head(3).to_dict('records') if len(df) > 0 else []
                }
                
                analysis['sheets'].append(sheet_analysis)
                analysis['total_rows'] += len(df)
                
                sprint(f"\n  📄 Sheet: {sheet_name}")
                sprint(f"     Rows: {len(df)}")
                sprint(f"     Columns: {list(df.columns)}")
                
                if len(df) > 0:
                    sprint(f"     Sample data (first row):")
                    for col, val in df.iloc[0].items():
                        sprint(f"       {col}: {val}")
            
            return analysis
            
        except Exception as e:
            sprint(f"ERROR: Error analyzing file {file_path}: {str(e)}")
            return {'error': str(e)}
    
    def create_academic_year(self) -> bool:
        """
        Create or get the academic year 2025-2026
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.dry_run:
                sprint(f"DRY RUN: Would create/verify academic year: {self.academic_year}")
                self.academic_year_id = 1  # Mock ID for dry run
                return True
            
            if not self.db_conn:
                sprint(f"ERROR: No database connection for academic year creation")
                return False
            
            cursor = self.db_conn.cursor()
            
            # Check if academic year already exists
            cursor.execute("""
                SELECT academic_year_id FROM academic_years 
                WHERE year = %s
                LIMIT 1
            """, (self.academic_year,))
            
            existing = cursor.fetchone()
            if existing:
                self.academic_year_id = existing[0]
                sprint(f"📅 Using existing academic year: {self.academic_year} (ID: {self.academic_year_id})")
                return True
            
            # Create new academic year
            cursor.execute("""
                INSERT INTO academic_years (
                    year, start_date, end_date, semester, is_active, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, NOW(), NOW()
                ) RETURNING academic_year_id
            """, (
                self.academic_year,
                '2025-08-01',  # Start date
                '2026-07-31',  # End date  
                '1ST',         # Semester
                True           # Is active
            ))
            
            self.academic_year_id = cursor.fetchone()[0]
            sprint(f"📅 Created academic year: {self.academic_year} (ID: {self.academic_year_id})")
            return True
            
        except Exception as e:
            sprint(f"ERROR: Error creating academic year: {str(e)}")
            self.stats['errors'].append(f"Academic year creation: {str(e)}")
            return False
    
    def normalize_student_data(self, row: Dict[str, Any], source: str = "INTERNAL") -> Dict[str, Any]:
        """
        Normalize student data from Excel row to database format
        
        Args:
            row: Raw row data from Excel
            source: Data source (INTERNAL or EXTERNAL)
            
        Returns:
            Normalized student data
        """
        # Extract grade/year info from Column F (Unnamed: 5)
        grade_year_info = self._parse_grade_year(row)
        
        # Extract actual names from Column B if available, otherwise use random names
        names = self._extract_names(row)
        
        # Map common column variations
        student_data = {
            'firstName': names['firstName'],
            'lastName': names['lastName'],
            'middleInitial': names['middleInitial'],
            'program': grade_year_info['program'],
            'yearLevel': grade_year_info['yearLevel'],
            'gradeLevel': grade_year_info['gradeLevel'],
            'status': 'Active',
            'graduationStatus': 'Active',
            'termType': 'SEMESTER',
            'birthDate': self._extract_birth_date(row, grade_year_info['gradeLevel']),
            'isArchived': False
        }
        
        return student_data
    
    def normalize_scholarship_data(self, row: Dict[str, Any], source: str = "INTERNAL", student_program: str = "Unknown", financial_data: Dict[str, float] = None) -> Dict[str, Any]:
        """
        Normalize scholarship data from Excel row to database format
        
        Args:
            row: Raw row data from Excel
            source: Data source (INTERNAL or EXTERNAL)
            student_program: The student's program to determine eligibility
            financial_data: Extracted financial data from the same row
            
        Returns:
            Normalized scholarship data
        """
        if financial_data is None:
            financial_data = {}
        
        scholarship_data = {
            'scholarshipName': self._extract_scholarship_description(row, source),
            'type': self._extract_scholarship_type(row, source),
            'sponsor': self._extract_sponsor(row, source),
            'amount': financial_data.get('amountSubsidy', self._extract_amount(row)),
            'source': source,
            'status': 'Active',
            'grantType': self._extract_grant_type(row),
            'eligibleGradeLevels': self._extract_eligible_grades(row),
            'eligiblePrograms': self._extract_eligible_programs(row, student_program),
            'coveredTerms': '1ST,2ND',
            'coversTuition': financial_data.get('tuitionFee', 0) > 0,
            'coversMiscellaneous': financial_data.get('miscellaneousFee', 0) > 0,
            'coversLaboratory': financial_data.get('laboratoryFee', 0) > 0,
            'coversOther': financial_data.get('otherFee', 0) > 0,
            'tuitionFee': financial_data.get('tuitionFee', 0),
            'miscellaneousFee': financial_data.get('miscellaneousFee', 0),
            'laboratoryFee': financial_data.get('laboratoryFee', 0),
            'otherFee': financial_data.get('otherFee', 0),
            'amountSubsidy': financial_data.get('amountSubsidy', 0),
            'percentSubsidy': financial_data.get('percentSubsidy', 0),
            'requirements': self._extract_requirements(row),
            'academicYearId': self.academic_year_id
        }
        
        return scholarship_data
    
    def _parse_grade_year(self, row: Dict[str, Any]) -> Dict[str, str]:
        """
        Parse grade/year information from Column F (Unnamed: 5)
        
        Args:
            row: Excel row data
            
        Returns:
            Dictionary with program, yearLevel, and gradeLevel
        """
        grade_year_field = 'Unnamed: 5'  # Column F
        grade_year_raw = ""
        
        if grade_year_field in row and pd.notna(row[grade_year_field]):
            grade_year_raw = str(row[grade_year_field]).strip()
        
        # Parse different formats
        result = {
            'program': 'Unknown',
            'yearLevel': 'Unknown',
            'gradeLevel': 'Unknown'
        }
        
        if not grade_year_raw or grade_year_raw.lower() in ['nan', 'grade/year']:
            return result
        
        # College programs (e.g., "BSIT 2", "BSBA 1", "BEED 4")
        college_programs = {
            'BSIT': 'Bachelor of Science in Information Technology',
            'BSBA': 'Bachelor of Science in Business Administration', 
            'BEED': 'Bachelor of Elementary Education',
            'BSCS': 'Bachelor of Science in Computer Science',
            'BSHM': 'Bachelor of Science in Hotel Management',
            'BSTM': 'Bachelor of Science in Tourism Management',
            'BSA': 'Bachelor of Science in Agriculture',
            'BSAC': 'Bachelor of Science in Accountancy',
            'BSED': 'Bachelor of Secondary Education',
            'BSHR': 'Bachelor of Science in Human Resources',
            'BSHRM': 'Bachelor of Science in Hotel and Restaurant Management'
        }
        
        # Check for college programs
        for prog_code, prog_name in college_programs.items():
            if prog_code in grade_year_raw.upper():
                # Extract year number
                year_match = None
                parts = grade_year_raw.upper().replace(prog_code, '').strip()
                
                # Handle various formats: "BSIT 2", "BSIT2", "BSIT 2 "
                if parts:
                    year_match = ''.join(filter(str.isdigit, parts))
                
                if year_match and year_match.isdigit():
                    year_num = int(year_match)
                    if 1 <= year_num <= 4:
                        result['program'] = prog_code  # Use the program code (BSIT, BSBA, etc.)
                        result['yearLevel'] = f"{year_num}{self._get_ordinal_suffix(year_num)} Year"
                        result['gradeLevel'] = f"College Year {year_num}"  # More appropriate than Grade 13-16
                        return result
        
        # K-12 Grades
        grade_year_upper = grade_year_raw.upper()
        
        # Handle "G6", "G7", etc. format
        if grade_year_upper.startswith('G') and len(grade_year_upper) >= 2:
            grade_num_str = grade_year_upper[1:]
            if grade_num_str.isdigit():
                grade_num = int(grade_num_str)
                if 1 <= grade_num <= 12:
                    result['program'] = 'K-12'  # Use K-12 as program code
                    result['gradeLevel'] = f"Grade {grade_num}"
                    result['yearLevel'] = self._grade_to_year_level(grade_num)
                    return result
        
        # Handle "GR. 8", "GR. 9" format
        if 'GR.' in grade_year_upper:
            grade_part = grade_year_upper.replace('GR.', '').strip()
            if grade_part.isdigit():
                grade_num = int(grade_part)
                if 1 <= grade_num <= 12:
                    result['program'] = 'K-12'  # Use K-12 as program code
                    result['gradeLevel'] = f"Grade {grade_num}"
                    result['yearLevel'] = self._grade_to_year_level(grade_num)
                    return result
        
        # Handle "Grade 2", "Grade 3" format
        if 'GRADE' in grade_year_upper:
            grade_part = grade_year_upper.replace('GRADE', '').strip()
            if grade_part.isdigit():
                grade_num = int(grade_part)
                if 1 <= grade_num <= 12:
                    result['program'] = 'K-12'  # Use K-12 as program code
                    result['gradeLevel'] = f"Grade {grade_num}"
                    result['yearLevel'] = self._grade_to_year_level(grade_num)
                    return result
        
        # Handle "Kindergarten"
        if 'KINDERGARTEN' in grade_year_upper:
            result['program'] = 'K-12'  # Use K-12 as program code
            result['gradeLevel'] = 'Kindergarten'
            result['yearLevel'] = 'Kindergarten'
            return result
        
        # Handle special cases like "PN 2" (Practical Nursing)
        if 'PN' in grade_year_upper:
            year_match = ''.join(filter(str.isdigit, grade_year_raw))
            if year_match:
                year_num = int(year_match)
                result['program'] = 'PN'  # Use program code
                result['yearLevel'] = f"{year_num}{self._get_ordinal_suffix(year_num)} Year"
                result['gradeLevel'] = f"College Year {year_num}"
                return result
        
        # Default for unrecognized formats
        sprint(f"    ⚠️  Unrecognized grade/year format: '{grade_year_raw}' - using defaults")
        result['program'] = 'OTHERS'  # Use OTHERS as program code for unknown programs
        result['yearLevel'] = '1st Year'
        result['gradeLevel'] = 'College Year 1'
        
        return result
    
    def _extract_names(self, row: Dict[str, Any]) -> Dict[str, str]:
        """Extract names from Column B or generate random names for anonymization"""
        names_field = 'Unnamed: 1'  # Column B
        
        # For privacy protection, always use random names instead of real names
        # Even if names exist in Column B, we'll anonymize them
        
        # You can uncomment the lines below to use actual names from Column B:
        # if names_field in row and pd.notna(row[names_field]):
        #     name_value = str(row[names_field]).strip()
        #     if name_value and name_value.isdigit():  # Skip if it's just a number
        #         return self.generate_random_name()
        #     # Parse actual name here if needed
        #     # return self.parse_actual_name(name_value)
        
        return self.generate_random_name()
    
    def _extract_financial_data(self, row: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract financial data from Excel columns G-M
        
        Returns:
            Dictionary with tuition, fees, subsidies
        """
        financial_data = {
            'tuitionFee': self._safe_float(row.get('Unnamed: 6', 0)),        # Column G
            'otherFee': self._safe_float(row.get('Unnamed: 7', 0)),          # Column H
            'miscellaneousFee': self._safe_float(row.get('Unnamed: 8', 0)),  # Column I
            'laboratoryFee': self._safe_float(row.get('Unnamed: 9', 0)),     # Column J
            'totalFees': self._safe_float(row.get('Unnamed: 10', 0)),        # Column K
            'amountSubsidy': self._safe_float(row.get('Unnamed: 11', 0)),    # Column L
            'percentSubsidy': self._safe_float(row.get('Unnamed: 12', 0))    # Column M
        }
        
        # Calculate total if not provided
        if not financial_data['totalFees']:
            financial_data['totalFees'] = (
                financial_data['tuitionFee'] + 
                financial_data['otherFee'] + 
                financial_data['miscellaneousFee'] + 
                financial_data['laboratoryFee']
            )
        
        return financial_data
    
    def _safe_float(self, value) -> float:
        """Safely convert value to float"""
        try:
            if pd.notna(value) and str(value).strip() and str(value).strip() != 'nan':
                # Remove currency symbols and commas
                clean_val = str(value).replace('₱', '').replace(',', '').replace('$', '').strip()
                return float(clean_val)
        except:
            pass
        return 0.0
    
    def _extract_scholarship_description(self, row: Dict[str, Any], source: str) -> str:
        """Extract scholarship description from Column A"""
        desc_field = 'EXTERNALLY FUNDED'  # Column A (this is the header name)
        
        if desc_field in row and pd.notna(row[desc_field]):
            description = str(row[desc_field]).strip()
            
            # Skip header rows and section dividers
            skip_values = ['EXTERNALLY FUNDED', 'INTERNALLY FUNDED', 'DESCRIPTION', 'BASIC EDUCATION', 
                          'GRADE SCHOOL', 'JUNIOR HIGH SCHOOL', 'SENIOR HIGH SCHOOL', 'COLLEGE', 'TOTAL']
            
            if description and description not in skip_values and description != 'nan':
                return description
        
        # Default descriptions based on source
        if source == "INTERNAL":
            return "Internal Scholarship Program"
        else:
            return "External Scholarship Program"
    
    def _get_ordinal_suffix(self, num: int) -> str:
        """Get ordinal suffix for numbers (1st, 2nd, 3rd, 4th)"""
        if 10 <= num % 100 <= 20:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(num % 10, 'th')
        return suffix
    
    def _grade_to_year_level(self, grade_num: int) -> str:
        """Convert grade number to year level description"""
        if grade_num == 0:
            return 'Kindergarten'
        elif 1 <= grade_num <= 6:
            return 'Elementary'
        elif 7 <= grade_num <= 10:
            return 'Junior High School'
        elif 11 <= grade_num <= 12:
            return 'Senior High School'
        else:
            return f"Grade {grade_num}"
    
    def _extract_year_level(self, row: Dict[str, Any]) -> str:
        """Extract year level from row data"""
        year_fields = ['year_level', 'Year Level', 'Year', 'year', 'YEAR_LEVEL']
        for field in year_fields:
            if field in row and pd.notna(row[field]):
                year = str(row[field]).strip()
                if year.lower() in ['1', 'first', '1st']:
                    return '1st Year'
                elif year.lower() in ['2', 'second', '2nd']:
                    return '2nd Year'
                elif year.lower() in ['3', 'third', '3rd']:
                    return '3rd Year'
                elif year.lower() in ['4', 'fourth', '4th']:
                    return '4th Year'
                return year
        return '1st Year'  # Default
    
    def _extract_grade_level(self, row: Dict[str, Any]) -> str:
        """Extract grade level from row data"""
        # For college level students, this is typically the same as year level
        year_level = self._extract_year_level(row)
        grade_mapping = {
            '1st Year': 'Grade 13',
            '2nd Year': 'Grade 14', 
            '3rd Year': 'Grade 15',
            '4th Year': 'Grade 16'
        }
        return grade_mapping.get(year_level, 'Grade 13')
    
    def _extract_birth_date(self, row: Dict[str, Any], grade_level: str = "Grade 13") -> Optional[str]:
        """Extract birth date from row data"""
        date_fields = ['birth_date', 'birthdate', 'Birth Date', 'DOB', 'dob']
        for field in date_fields:
            if field in row and pd.notna(row[field]):
                try:
                    if isinstance(row[field], (datetime, date)):
                        return row[field].strftime('%Y-%m-%d')
                    else:
                        # Try to parse string dates
                        return pd.to_datetime(row[field]).strftime('%Y-%m-%d')
                except:
                    continue
        
        # Generate appropriate birth date based on grade level
        import random
        from datetime import timedelta
        today = datetime.now()
        
        # Determine approximate age based on grade level
        if grade_level == 'Kindergarten':
            age_range = (5, 6)
        elif 'Grade 1' in grade_level or 'Grade 2' in grade_level or 'Grade 3' in grade_level:
            grade_num = int(''.join(filter(str.isdigit, grade_level)))
            age_range = (5 + grade_num, 7 + grade_num)  # Roughly 6-10 years old
        elif 'Grade 4' in grade_level or 'Grade 5' in grade_level or 'Grade 6' in grade_level:
            grade_num = int(''.join(filter(str.isdigit, grade_level)))
            age_range = (5 + grade_num, 7 + grade_num)  # Roughly 9-13 years old
        elif 'Grade 7' in grade_level or 'Grade 8' in grade_level or 'Grade 9' in grade_level or 'Grade 10' in grade_level:
            grade_num = int(''.join(filter(str.isdigit, grade_level)))
            age_range = (5 + grade_num, 7 + grade_num)  # Roughly 12-17 years old
        elif 'Grade 11' in grade_level or 'Grade 12' in grade_level:
            grade_num = int(''.join(filter(str.isdigit, grade_level)))
            age_range = (5 + grade_num, 7 + grade_num)  # Roughly 16-19 years old
        elif 'College Year' in grade_level:
            # College students (18-24 years old)
            age_range = (18, 24)
        else:
            # Default to college age
            age_range = (18, 24)
        
        # Generate random birth date within age range
        years_ago = random.randint(age_range[0], age_range[1])
        days_variation = random.randint(0, 365)
        birth_date = today - timedelta(days=years_ago*365 + days_variation)
        return birth_date.strftime('%Y-%m-%d')
    
    def _extract_scholarship_name(self, row: Dict[str, Any], source: str) -> str:
        """Extract scholarship name from row data"""
        name_fields = ['scholarship_name', 'Scholarship Name', 'Program', 'program']
        for field in name_fields:
            if field in row and pd.notna(row[field]):
                return str(row[field]).strip()
        
        # Default names based on source
        if source == "INTERNAL":
            return "Internal Scholarship Program"
        else:
            return "External Scholarship Program"
    
    def _extract_scholarship_type(self, row: Dict[str, Any], source: str) -> str:
        """Extract scholarship type from row data"""
        type_fields = ['type', 'Type', 'scholarship_type', 'Scholarship Type']
        for field in type_fields:
            if field in row and pd.notna(row[field]):
                scholarship_type = str(row[field]).upper().strip()
                # Map to valid types
                if 'CHED' in scholarship_type:
                    return 'CHED'
                elif 'LGU' in scholarship_type:
                    return 'LGU'
                elif 'PAED' in scholarship_type:
                    return 'PAED'
                else:
                    return scholarship_type
        
        # Default based on source
        return 'SCHOOL_GRANT' if source == "INTERNAL" else 'LGU'
    
    def _extract_sponsor(self, row: Dict[str, Any], source: str) -> str:
        """Extract sponsor from row data"""
        sponsor_fields = ['sponsor', 'Sponsor', 'funding_source', 'Funding Source']
        for field in sponsor_fields:
            if field in row and pd.notna(row[field]):
                return str(row[field]).strip()
        
        return 'Internal Fund' if source == "INTERNAL" else 'External Fund'
    
    def _extract_amount(self, row: Dict[str, Any]) -> float:
        """Extract scholarship amount from row data"""
        amount_fields = ['amount', 'Amount', 'grant_amount', 'Grant Amount', 'scholarship_amount']
        for field in amount_fields:
            if field in row and pd.notna(row[field]):
                try:
                    # Handle string amounts with currency symbols
                    amount_str = str(row[field]).replace('₱', '').replace(',', '').replace('$', '').strip()
                    return float(amount_str)
                except:
                    continue
        
        # Default amounts
        return 25000.00  # Default scholarship amount
    
    def _extract_grant_type(self, row: Dict[str, Any]) -> str:
        """Extract grant type from row data"""
        grant_fields = ['grant_type', 'Grant Type', 'coverage', 'Coverage']
        for field in grant_fields:
            if field in row and pd.notna(row[field]):
                grant_type = str(row[field]).upper().strip()
                if 'FULL' in grant_type:
                    return 'FULL'
                elif 'TUITION' in grant_type:
                    return 'TUITION_ONLY'
                elif 'MISC' in grant_type:
                    return 'MISC_ONLY'
                elif 'LAB' in grant_type:
                    return 'LAB_ONLY'
        
        return 'FULL'  # Default
    
    def _extract_eligible_grades(self, row: Dict[str, Any]) -> str:
        """Extract eligible grade levels from row data"""
        return 'Grade 13,Grade 14,Grade 15,Grade 16'  # Default for college
    
    def _extract_eligible_programs(self, row: Dict[str, Any], student_program: str = "Unknown") -> str:
        """Extract eligible programs from row data"""
        program_fields = ['eligible_programs', 'programs', 'Program']
        for field in program_fields:
            if field in row and pd.notna(row[field]):
                return str(row[field]).strip()
        
        # If we have student program info, use it to determine eligibility
        if student_program and student_program != "Unknown":
            # Map program codes for database storage
            program_code = student_program  # Now we're already using codes
            
            # Group related programs
            if program_code in ['BSIT', 'BSCS']:
                return 'BSIT,BSCS'
            elif program_code in ['BSBA', 'BSAC']:
                return 'BSBA,BSAC'
            elif program_code in ['BSHM', 'BSHRM', 'BSTM']:
                return 'BSHM,BSHRM,BSTM'
            elif program_code in ['BEED', 'BSED']:
                return 'BEED,BSED'
            elif program_code == 'K-12':
                return 'K-12'
            elif program_code == 'PN':
                return 'PN'
            elif program_code == 'OTHERS':
                return 'OTHERS'
            else:
                return program_code
        
        # Default programs for mixed eligibility
        return 'BSIT,BSBA,BEED,BSCS,BSHM,K-12,OTHERS'
    
    def _extract_requirements(self, row: Dict[str, Any]) -> str:
        """Extract requirements from row data"""
        req_fields = ['requirements', 'Requirements', 'eligibility', 'Eligibility']
        for field in req_fields:
            if field in row and pd.notna(row[field]):
                return str(row[field]).strip()
        
        return 'Maintain good academic standing, submit required documents'
    
    def import_excel_data(self, internal_file: str, external_file: str) -> bool:
        """
        Import data from both Excel files
        
        Args:
            internal_file: Path to internal scholarship Excel file
            external_file: Path to external scholarship Excel file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            sprint(f"\nStarting Excel Data Import for Academic Year {self.academic_year}")
            sprint(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE IMPORT'}")
            
            # Connect to database for live import
            if not self.dry_run:
                self.connect_database()
            
            # Create academic year first
            if not self.create_academic_year():
                return False
            
            # Process internal scholarships
            if os.path.exists(internal_file):
                sprint(f"\n📁 Processing Internal File: {internal_file}")
                self.process_scholarship_file(internal_file, "INTERNAL")
            else:
                sprint(f"⚠️  Internal file not found: {internal_file}")
            
            # Process external scholarships  
            if os.path.exists(external_file):
                sprint(f"\n📁 Processing External File: {external_file}")
                self.process_scholarship_file(external_file, "EXTERNAL")
            else:
                sprint(f"⚠️  External file not found: {external_file}")
            
            # Commit transaction for live import
            if not self.dry_run and self.db_conn:
                sprint(f"\n💾 Committing changes to database...")
                self.db_conn.commit()
                sprint(f"✅ Changes committed successfully!")
            
            # Print summary
            self.print_summary()
            
            return True
            
        except Exception as e:
            sprint(f"❌ Error during import: {str(e)}")
            self.stats['errors'].append(f"Import process: {str(e)}")
            
            # Rollback on error
            if not self.dry_run and self.db_conn:
                sprint(f"⚠️  Rolling back changes due to error...")
                self.db_conn.rollback()
            
            return False
        finally:
            # Always close database connection
            if not self.dry_run:
                self.close_database()
    
    def process_scholarship_file(self, file_path: str, source: str):
        """
        Process a single scholarship Excel file
        
        Args:
            file_path: Path to Excel file
            source: INTERNAL or EXTERNAL
        """
        try:
            # First analyze the file structure
            analysis = self.analyze_excel_file(file_path)
            if 'error' in analysis:
                return
            
            # Process each sheet
            excel_file = pd.ExcelFile(file_path)
            
            for sheet_name in excel_file.sheet_names:
                sprint(f"\n  📄 Processing sheet: {sheet_name}")
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                if len(df) == 0:
                    sprint(f"     ⚠️  Sheet is empty, skipping...")
                    continue
                
                # Process each row
                for index, row in df.iterrows():
                    try:
                        self.process_student_scholarship_row(row.to_dict(), source, sheet_name)
                        self.stats['students_processed'] += 1
                        
                        if self.stats['students_processed'] % 10 == 0:
                            sprint(f"     📊 Processed {self.stats['students_processed']} records...")
                            
                    except Exception as e:
                        error_msg = f"Row {index + 2} in {sheet_name}: {str(e)}"
                        sprint(f"     ❌ Error processing row {index + 2}: {str(e)}")
                        self.stats['errors'].append(error_msg)
                        continue
                
        except Exception as e:
            sprint(f"❌ Error processing file {file_path}: {str(e)}")
            self.stats['errors'].append(f"File processing {file_path}: {str(e)}")
    
    def _begin_savepoint(self, sp_name: str):
        """Create a savepoint for isolated transaction scope"""
        if self.db_conn:
            cursor = self.db_conn.cursor()
            cursor.execute(f"SAVEPOINT {sp_name}")

    def _rollback_savepoint(self, sp_name: str):
        """Rollback to savepoint (recover from error within a row)"""
        if self.db_conn:
            cursor = self.db_conn.cursor()
            cursor.execute(f"ROLLBACK TO SAVEPOINT {sp_name}")

    def _release_savepoint(self, sp_name: str):
        """Release savepoint after successful row processing"""
        if self.db_conn:
            cursor = self.db_conn.cursor()
            cursor.execute(f"RELEASE SAVEPOINT {sp_name}")

    def process_student_scholarship_row(self, row: Dict[str, Any], source: str, sheet_name: str):
        """
        Process a single row to create student and scholarship records
        
        Args:
            row: Row data from Excel
            source: INTERNAL or EXTERNAL
            sheet_name: Name of the Excel sheet
        """
        # Skip empty rows
        if all(pd.isna(v) or str(v).strip() == '' for v in row.values()):
            return
        
        # Skip header rows and section dividers
        grade_year_field = 'Unnamed: 5'  # Column F
        if grade_year_field in row:
            grade_year_value = str(row[grade_year_field]).strip() if pd.notna(row[grade_year_field]) else ""
            if grade_year_value in ['nan', '', 'Grade/year'] or 'DESCRIPTION' in str(row.get('EXTERNALLY FUNDED', '')):
                return
        
        # Extract financial data first
        financial_data = self._extract_financial_data(row)
        
        # Skip rows with no financial data (likely section headers)
        if all(v == 0 for v in financial_data.values()):
            return
        
        # Normalize data
        student_data = self.normalize_student_data(row, source)
        scholarship_data = self.normalize_scholarship_data(row, source, student_data['program'], financial_data)
        
        if self.dry_run:
            sprint(f"     🔍 DRY RUN - Would create:")
            sprint(f"        Student: {student_data['firstName']} {student_data['lastName']}")
            sprint(f"        Program: {student_data['program']}")
            sprint(f"        Grade/Year: {student_data['gradeLevel']} / {student_data['yearLevel']}")
            sprint(f"        Scholarship: {scholarship_data['scholarshipName']}")
            sprint(f"        Type: {scholarship_data['type']}, Subsidy: ₱{scholarship_data['amountSubsidy']:,.2f}")
            sprint(f"        Fees - Tuition: ₱{financial_data['tuitionFee']:,.2f}, Misc: ₱{financial_data['miscellaneousFee']:,.2f}, Lab: ₱{financial_data['laboratoryFee']:,.2f}")
            sprint(f"        Total Fees: ₱{financial_data['totalFees']:,.2f}, Subsidy %: {financial_data['percentSubsidy']:.1%}")
            self.stats['scholarships_processed'] += 1
            return
        
        # LIVE IMPORT - Use a savepoint per row so failures don't abort the transaction
        sp_name = f"sp_row_{self.stats['students_processed']}"
        try:
            self._begin_savepoint(sp_name)

            # 1. Create student
            student_id = self.create_student_in_db(student_data)
            if not student_id:
                self._rollback_savepoint(sp_name)
                sprint(f"     ❌ Failed to create student")
                return
            
            # 2. Create scholarship
            scholarship_id = self.create_scholarship_in_db(scholarship_data)
            if not scholarship_id:
                self._rollback_savepoint(sp_name)
                sprint(f"     ❌ Failed to create scholarship")
                return
            
            # 3. Link student to scholarship
            if self.link_student_scholarship(student_id, scholarship_id):
                self._release_savepoint(sp_name)
                sprint(f"     ✅ Created student #{student_id}, scholarship #{scholarship_id}, and linked them")
                self.stats['scholarships_processed'] += 1
            else:
                self._rollback_savepoint(sp_name)
                sprint(f"     ⚠️  Created student/scholarship but failed to link")
                
        except Exception as e:
            error_msg = f"Processing row: {str(e)}"
            sprint(f"     ❌ Error: {error_msg}")
            self.stats['errors'].append(error_msg)
            try:
                self._rollback_savepoint(sp_name)
            except Exception:
                pass  # savepoint may not exist
    
    def print_summary(self):
        """Print import summary statistics and save report to JSON file"""
        # --- Console output ---
        sprint(f"\n" + "="*60)
        sprint(f"[DATA] IMPORT SUMMARY - Academic Year {self.academic_year}")
        sprint(f"="*60)
        sprint(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE IMPORT'}")
        sprint(f"")
        sprint(f"[DATA] Statistics:")
        sprint(f"  Students Processed: {self.stats['students_processed']}")
        sprint(f"  Students Created: {self.stats['students_created']}")
        sprint(f"  Students Updated: {self.stats['students_updated']}")
        sprint(f"  Scholarships Processed: {self.stats['scholarships_processed']}")
        sprint(f"  Scholarships Created: {self.stats['scholarships_created']}")
        sprint(f"  Student-Scholarship Links: {self.stats['student_scholarships_created']}")
        sprint(f"")
        
        if self.stats['errors']:
            sprint(f"[ERROR] Errors ({len(self.stats['errors'])}):")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                sprint(f"  - {error}")
            if len(self.stats['errors']) > 10:
                sprint(f"  ... and {len(self.stats['errors']) - 10} more errors")
        else:
            sprint(f"[OK] No errors encountered!")
        
        sprint(f"="*60)
        
        # --- Save structured report to JSON ---
        self._save_report()

    def _save_report(self):
        """Save import report as a JSON file in the scripts/ directory."""
        report = {
            "academic_year": self.academic_year,
            "dry_run": self.dry_run,
            "timestamp": datetime.now().isoformat(),
            "statistics": {
                "students_processed": self.stats["students_processed"],
                "students_created": self.stats["students_created"],
                "students_updated": self.stats["students_updated"],
                "scholarships_processed": self.stats["scholarships_processed"],
                "scholarships_created": self.stats["scholarships_created"],
                "student_scholarships_created": self.stats["student_scholarships_created"],
            },
            "errors": self.stats["errors"][:50],  # cap at 50
            "error_count": len(self.stats["errors"]),
        }
        report_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "import_report.json",
        )
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        sprint(f"[OK] Report saved to: {report_path}")

def parse_cli_args() -> bool:
    """Parse command-line arguments to determine dry_run / live mode.
    
    Returns:
        True for dry-run (default), False for live import.
    """
    for arg in sys.argv[1:]:
        lower = arg.lower()
        if lower in ('--live', '-l', '--no-dry-run'):
            return False
        if lower in ('--dry-run', '-d', '--dryrun'):
            return True
        if lower in ('--help', '-h', '/?'):
            sprint("Usage: python excel_data_importer.py [--dry-run|--live]")
            sprint("  --dry-run  -d   Preview only (default)")
            sprint("  --live     -l   Perform actual database import")
            sys.exit(0)
    return True  # default: dry-run


def main():
    """Main function to run the importer"""
    sprint("Scholarship Tracking System - Excel Data Importer")
    sprint("=" * 60)
    
    dry_run = parse_cli_args()
    
    # File paths (using existing 2024-2025 files but treating as 2025-2026 data)
    docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs')
    internal_file = os.path.join(docs_dir, 'sample_InernallyFunded2024-2025.xlsx')
    external_file = os.path.join(docs_dir, 'sample_externallyFunded-2024-2025.xlsx')
    
    sprint(f"Files:")
    sprint(f"  Internal: {internal_file}")
    sprint(f"  External: {external_file}")
    sprint(f"  Mode: {'DRY RUN' if dry_run else 'LIVE IMPORT'}")
    
    # Initialize importer
    importer = ScholarshipDataImporter(
        dry_run=dry_run
    )
    
    # Check if files exist
    if not os.path.exists(internal_file):
        sprint(f"ERROR: Internal file not found: {internal_file}")
    if not os.path.exists(external_file):
        sprint(f"ERROR: External file not found: {external_file}")
    
    if not os.path.exists(internal_file) and not os.path.exists(external_file):
        sprint("ERROR: No Excel files found. Please ensure the files exist in the docs/ folder.")
        return
    
    # Run the import
    try:
        success = importer.import_excel_data(internal_file, external_file)
        if success:
            sprint(f"\nImport process completed successfully!")
            if importer.dry_run:
                sprint(f"NOTE: This was a DRY RUN. No data was actually imported.")
                sprint(f"TIP: To perform actual import, run with --live flag.")
        else:
            sprint(f"\nImport process failed!")
            
    except KeyboardInterrupt:
        sprint(f"\nImport cancelled by user")
    except Exception as e:
        sprint(f"\nUnexpected error: {str(e)}")

if __name__ == "__main__":
    main()