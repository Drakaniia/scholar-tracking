"""
Entity Relationship Diagram Generator for Scholarship Tracking System
This script creates a visual ERD using matplotlib and networkx
"""

import matplotlib.pyplot as plt
import networkx as nx
from matplotlib.patches import Rectangle
import numpy as np

def create_erd_visual():
    # Create a directed graph
    G = nx.DiGraph()

    # Define nodes (entities)
    entities = [
        'users', 'user_applications', 'students',
        'scholarships', 'student_scholarships'
    ]

    # Add nodes
    for entity in entities:
        G.add_node(entity)

    # Define relationships (edges)
    relationships = [
        ('users', 'user_applications'),  # User has applications
        ('users', 'students'),           # User has student profile
        ('students', 'student_scholarships'),  # Student applies for scholarships
        ('scholarships', 'student_scholarships')  # Scholarship is awarded to students
    ]

    # Add edges
    for source, target in relationships:
        G.add_edge(source, target)

    # Create the plot
    plt.figure(figsize=(14, 10))
    pos = {
        'users': (0, 2),
        'user_applications': (2, 3),
        'students': (0, 0),
        'scholarships': (4, 1),
        'student_scholarships': (2, 0)
    }

    # Draw nodes
    node_colors = ['#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C']
    nx.draw_networkx_nodes(G, pos, node_size=3000, node_color=node_colors, alpha=0.8)

    # Draw edges
    nx.draw_networkx_edges(G, pos, width=2, arrowstyle='-|>', arrowsize=20, edge_color='gray')

    # Add labels
    nx.draw_networkx_labels(G, pos, font_size=10, font_weight='bold')

    # Add title
    plt.title('Scholarship Tracking System - Entity Relationship Diagram', size=16, weight='bold')

    # Add legend for entities
    legend_text = """
    users: Authentication & User Management
    user_applications: User Registration Applications
    students: Student Profiles & Academic Info
    scholarships: Scholarship Details & Requirements
    student_scholarships: Student-Scholarship Relationships
    """

    plt.figtext(0.02, 0.02, legend_text, fontsize=9,
                bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray", alpha=0.8))

    # Remove axes
    plt.axis('off')
    plt.tight_layout()

    # Save the figure
    plt.savefig('scholarship_erd.png', dpi=300, bbox_inches='tight')
    print("ERD saved as 'scholarship_erd.png'")

    # Show the plot
    plt.show()

def create_entity_details():
    """Print detailed information about each entity"""
    entities = {
        'users': {
            'description': 'Main authentication table for system users',
            'attributes': [
                'id (Primary Key)',
                'email (Unique)',
                'password',
                'firstName',
                'lastName',
                'role (admin, staff, student)',
                'isActive',
                'studentId (Foreign Key)',
                'createdAt',
                'updatedAt'
            ]
        },
        'user_applications': {
            'description': 'Tracks applications made by users to become students',
            'attributes': [
                'id (Primary Key)',
                'userId (Foreign Key)',
                'status (Pending, Approved, Rejected)',
                'remarks',
                'createdAt',
                'updatedAt'
            ]
        },
        'students': {
            'description': 'Student profile information',
            'attributes': [
                'id (Primary Key)',
                'firstName',
                'middleName',
                'lastName',
                'yearLevel',
                'course',
                'tuitionFee',
                'educationLevel',
                'userId (Foreign Key)',
                'createdAt',
                'updatedAt'
            ]
        },
        'scholarships': {
            'description': 'Scholarship information',
            'attributes': [
                'id (Primary Key)',
                'name',
                'description',
                'type (Internal, External)',
                'category (CHED, TESDA, etc.)',
                'amount',
                'eligibility',
                'applicationStart',
                'applicationEnd',
                'isActive',
                'createdAt',
                'updatedAt'
            ]
        },
        'student_scholarships': {
            'description': 'Junction table linking students to scholarships',
            'attributes': [
                'id (Primary Key)',
                'studentId (Foreign Key)',
                'scholarshipId (Foreign Key)',
                'status (Pending, Approved, Rejected, Expired)',
                'dateApplied',
                'dateApproved',
                'remarks',
                'createdAt',
                'updatedAt'
            ]
        }
    }

    print("\nDetailed Entity Information:")
    print("=" * 50)
    for entity, info in entities.items():
        print(f"\n{entity.upper()}:")
        print(f"  Description: {info['description']}")
        print("  Attributes:")
        for attr in info['attributes']:
            print(f"    - {attr}")
        print()

if __name__ == "__main__":
    print("Generating ERD for Scholarship Tracking System...")

    # Create detailed description
    create_entity_details()

    # Create and show the visual ERD (only if required libraries are available)
    try:
        create_erd_visual()
    except ImportError as e:
        print(f"Matplotlib or NetworkX not available: {e}")
        print("Install with: pip install matplotlib networkx")
        print("\nERD.md file already contains the Mermaid diagram which can be viewed in Markdown viewers.")
