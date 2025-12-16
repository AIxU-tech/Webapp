"""
Seed Data Script for AIxU Development Environment

Run this script to populate your local database with fake data:
    python -m backend.seed_data

Or from the project root:
    python backend/seed_data.py
"""

import random
from datetime import datetime, timedelta

# Setup Flask app context
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# SAFETY: Only use DEV database URLs to prevent accidental production data loss
# Try DEV_DATABASE_URL_LOCAL first (for running from host machine),
# then fall back to DEV_DATABASE_URL (for running inside Docker)
DEV_DB_URL = os.environ.get('DEV_DATABASE_URL_LOCAL') or os.environ.get('DEV_DATABASE_URL')
if not DEV_DB_URL:
    print("ERROR: No dev database URL set in environment.")
    print("This script only runs against the development database for safety.")
    print("Set DEV_DATABASE_URL_LOCAL or DEV_DATABASE_URL in your .env file.")
    sys.exit(1)

print(f"Using database: {DEV_DB_URL.split('@')[1] if '@' in DEV_DB_URL else DEV_DB_URL}")

# Override DATABASE_URL with dev URL before importing app
os.environ['DATABASE_URL'] = DEV_DB_URL

from backend import create_app
from backend.extensions import db
from backend.models.user import User
from backend.models.university import University
from backend.models.note import Note
from backend.models.message import Message
from backend.models.relationships import UserFollows
from backend.models.university_role import UniversityRole
from backend.constants import UniversityRoles, ADMIN


def clear_existing_data():
    """Clear existing seed data (preserving any real data you want to keep)."""
    print("Clearing existing data...")
    # Delete in order to respect foreign key constraints
    UserFollows.query.delete()
    UniversityRole.query.delete()
    Message.query.delete()
    Note.query.delete()
    User.query.delete()
    University.query.delete()
    db.session.commit()
    print("Existing data cleared.")


def seed_universities():
    """Create 6 universities with AI clubs."""
    print("Seeding universities...")

    universities_data = [
        {
            "name": "University of Oregon",
            "clubName": "AISA",
            "location": "Eugene, OR",
            "email_domain": "uoregon",
            "description": "The AI Student Association at University of Oregon brings together students passionate about artificial intelligence, machine learning, and data science."
        },
        {
            "name": "Stanford University",
            "clubName": "Stanford AI Club",
            "location": "Stanford, CA",
            "email_domain": "stanford",
            "description": "Stanford's premier student organization for AI enthusiasts, hosting workshops, research talks, and hackathons."
        },
        {
            "name": "MIT",
            "clubName": "MIT AI Society",
            "location": "Cambridge, MA",
            "email_domain": "mit",
            "description": "Connecting MIT students with AI research opportunities and industry partners."
        },
        {
            "name": "UC Berkeley",
            "clubName": "Berkeley AI Research Students",
            "location": "Berkeley, CA",
            "email_domain": "berkeley",
            "description": "Student-led organization focused on AI research, ethics, and practical applications."
        },
        {
            "name": "Carnegie Mellon University",
            "clubName": "CMU AI Initiative",
            "location": "Pittsburgh, PA",
            "email_domain": "cmu",
            "description": "CMU's student hub for AI innovation, bridging robotics, NLP, and computer vision research."
        },
        {
            "name": "University of Washington",
            "clubName": "Husky AI",
            "location": "Seattle, WA",
            "email_domain": "uw",
            "description": "UW's AI community fostering collaboration between students and the Seattle tech industry."
        },
    ]

    universities = []
    for data in universities_data:
        uni = University(
            name=data["name"],
            clubName=data["clubName"],
            location=data["location"],
            email_domain=data["email_domain"],
            description=data["description"],
            member_count=0,
            recent_posts=0,
            upcoming_events=random.randint(0, 5)
        )
        db.session.add(uni)
        universities.append(uni)

    db.session.commit()
    print(f"Created {len(universities)} universities.")
    return universities


def seed_users(universities):
    """Create 20 users distributed across universities."""
    print("Seeding users...")

    # Map email domains to university objects
    domain_to_uni = {uni.email_domain: uni for uni in universities}

    users_data = [
        # Oliver at UO (president of AISA)
        {
            "email": "osto@uoregon.edu",
            "first_name": "Oliver",
            "last_name": "Stoner-German",
            "about_section": "AI enthusiast and president of AISA. Passionate about machine learning and its applications.",
            "location": "Eugene, OR",
            "skills": ["Python", "PyTorch", "Machine Learning", "React"],
            "interests": ["Deep Learning", "NLP", "Computer Vision"],
            "permission_level": ADMIN
        },
        # More UO students
        {
            "email": "jsmith@uoregon.edu",
            "first_name": "Jordan",
            "last_name": "Smith",
            "about_section": "CS major interested in reinforcement learning.",
            "location": "Eugene, OR",
            "skills": ["Python", "TensorFlow"],
            "interests": ["Reinforcement Learning", "Game AI"]
        },
        {
            "email": "mwilson@uoregon.edu",
            "first_name": "Maya",
            "last_name": "Wilson",
            "about_section": "Data science enthusiast exploring AI ethics.",
            "location": "Portland, OR",
            "skills": ["R", "Python", "SQL"],
            "interests": ["AI Ethics", "Data Science"]
        },
        # Stanford students
        {
            "email": "alee@stanford.edu",
            "first_name": "Alex",
            "last_name": "Lee",
            "about_section": "PhD candidate researching transformer architectures.",
            "location": "Palo Alto, CA",
            "skills": ["PyTorch", "JAX", "CUDA"],
            "interests": ["Transformers", "NLP", "Efficient ML"]
        },
        {
            "email": "schen@stanford.edu",
            "first_name": "Sarah",
            "last_name": "Chen",
            "about_section": "Undergrad building AI-powered accessibility tools.",
            "location": "Stanford, CA",
            "skills": ["Python", "Swift", "CoreML"],
            "interests": ["Accessibility", "Mobile ML", "HCI"]
        },
        {
            "email": "rjohnson@stanford.edu",
            "first_name": "Ryan",
            "last_name": "Johnson",
            "about_section": "Exploring the intersection of AI and robotics.",
            "location": "Stanford, CA",
            "skills": ["ROS", "Python", "C++"],
            "interests": ["Robotics", "Computer Vision", "SLAM"]
        },
        # MIT students
        {
            "email": "npatel@mit.edu",
            "first_name": "Nadia",
            "last_name": "Patel",
            "about_section": "Working on AI safety and alignment research.",
            "location": "Cambridge, MA",
            "skills": ["Python", "Math", "Philosophy"],
            "interests": ["AI Safety", "Alignment", "Ethics"]
        },
        {
            "email": "tkim@mit.edu",
            "first_name": "Tyler",
            "last_name": "Kim",
            "about_section": "Building neural network hardware accelerators.",
            "location": "Boston, MA",
            "skills": ["Verilog", "Python", "C"],
            "interests": ["Hardware", "Edge AI", "Optimization"]
        },
        {
            "email": "lgarcia@mit.edu",
            "first_name": "Luna",
            "last_name": "Garcia",
            "about_section": "Passionate about democratizing AI education.",
            "location": "Cambridge, MA",
            "skills": ["Python", "JavaScript", "Teaching"],
            "interests": ["Education", "MLOps", "Open Source"]
        },
        # Berkeley students
        {
            "email": "dwang@berkeley.edu",
            "first_name": "David",
            "last_name": "Wang",
            "about_section": "Research assistant in the Berkeley AI Research lab.",
            "location": "Berkeley, CA",
            "skills": ["PyTorch", "Distributed Computing", "Python"],
            "interests": ["Distributed ML", "Large Models", "Systems"]
        },
        {
            "email": "ehernandez@berkeley.edu",
            "first_name": "Elena",
            "last_name": "Hernandez",
            "about_section": "Focusing on fair and unbiased AI systems.",
            "location": "Oakland, CA",
            "skills": ["Python", "Statistics", "Fairlearn"],
            "interests": ["Fairness", "Bias Detection", "ML Interpretability"]
        },
        {
            "email": "jthompson@berkeley.edu",
            "first_name": "Jake",
            "last_name": "Thompson",
            "about_section": "Full-stack developer integrating LLMs into products.",
            "location": "Berkeley, CA",
            "skills": ["TypeScript", "Python", "LangChain"],
            "interests": ["LLMs", "Product Development", "Startups"]
        },
        # CMU students
        {
            "email": "abrown@cmu.edu",
            "first_name": "Aisha",
            "last_name": "Brown",
            "about_section": "Robotics PhD student working on manipulation.",
            "location": "Pittsburgh, PA",
            "skills": ["Python", "ROS", "Reinforcement Learning"],
            "interests": ["Robotics", "Manipulation", "Sim2Real"]
        },
        {
            "email": "mzhang@cmu.edu",
            "first_name": "Michael",
            "last_name": "Zhang",
            "about_section": "NLP researcher specializing in multilingual models.",
            "location": "Pittsburgh, PA",
            "skills": ["Python", "Transformers", "Linguistics"],
            "interests": ["NLP", "Multilingual AI", "Translation"]
        },
        {
            "email": "kwhite@cmu.edu",
            "first_name": "Katie",
            "last_name": "White",
            "about_section": "Combining art and AI for generative creativity.",
            "location": "Pittsburgh, PA",
            "skills": ["Python", "Stable Diffusion", "Processing"],
            "interests": ["Generative Art", "Creative AI", "Design"]
        },
        # UW students
        {
            "email": "jpark@uw.edu",
            "first_name": "James",
            "last_name": "Park",
            "about_section": "Working at the intersection of AI and healthcare.",
            "location": "Seattle, WA",
            "skills": ["Python", "TensorFlow", "Medical Imaging"],
            "interests": ["Healthcare AI", "Medical Imaging", "Diagnostics"]
        },
        {
            "email": "omartin@uw.edu",
            "first_name": "Olivia",
            "last_name": "Martin",
            "about_section": "Building conversational AI systems.",
            "location": "Seattle, WA",
            "skills": ["Python", "Rasa", "Dialogflow"],
            "interests": ["Conversational AI", "Chatbots", "Voice Assistants"]
        },
        {
            "email": "crodriguez@uw.edu",
            "first_name": "Carlos",
            "last_name": "Rodriguez",
            "about_section": "ML engineer focusing on recommendation systems.",
            "location": "Bellevue, WA",
            "skills": ["Python", "Spark", "RecSys"],
            "interests": ["Recommendations", "Personalization", "Big Data"]
        },
        {
            "email": "etaylor@uw.edu",
            "first_name": "Emma",
            "last_name": "Taylor",
            "about_section": "Climate tech advocate using AI for sustainability.",
            "location": "Seattle, WA",
            "skills": ["Python", "Satellite Imagery", "GIS"],
            "interests": ["Climate Tech", "Sustainability", "Remote Sensing"]
        },
        {
            "email": "wlee@uw.edu",
            "first_name": "William",
            "last_name": "Lee",
            "about_section": "Security researcher exploring adversarial ML.",
            "location": "Seattle, WA",
            "skills": ["Python", "Security", "Adversarial ML"],
            "interests": ["ML Security", "Adversarial Examples", "Robustness"]
        },
    ]

    users = []
    for data in users_data:
        user = User(
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            about_section=data.get("about_section"),
            location=data.get("location"),
            permission_level=data.get("permission_level", 0),
            join_date=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
            post_count=0,
            follower_count=0,
            following_count=0
        )
        # Oliver gets a custom password, others use default
        if data["email"] == "osto@uoregon.edu":
            user.set_password("Improve Self3!")
        else:
            user.set_password("password123")
        user.set_skills_list(data.get("skills", []))
        user.set_interests_list(data.get("interests", []))

        # Set university based on email domain
        domain = data["email"].split("@")[1].replace(".edu", "")
        if domain in domain_to_uni:
            user.university = domain_to_uni[domain].name

        db.session.add(user)
        users.append(user)

    db.session.commit()
    print(f"Created {len(users)} users.")
    return users


def seed_university_memberships(users, universities):
    """Add users as members of their universities and assign roles."""
    print("Seeding university memberships and roles...")

    domain_to_uni = {uni.email_domain: uni for uni in universities}

    for user in users:
        domain = user.email.split("@")[1].replace(".edu", "")
        if domain in domain_to_uni:
            uni = domain_to_uni[domain]
            uni.add_member(user.id)

            # Oliver is president of AISA
            if user.email == "osto@uoregon.edu":
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.PRESIDENT)
            # First user at each other university becomes president
            elif uni.member_count == 1:
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.PRESIDENT)
            # Second user becomes executive
            elif uni.member_count == 2:
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.EXECUTIVE)
            else:
                UniversityRole.set_role(user.id, uni.id, UniversityRoles.MEMBER)

    db.session.commit()
    print("University memberships and roles assigned.")


def seed_notes(users):
    """Create 10 notes from various users."""
    print("Seeding notes...")

    notes_data = [
        {
            "title": "Getting Started with PyTorch",
            "content": "Here's a quick guide to getting started with PyTorch for deep learning. First, install it with pip: `pip install torch`. Then you can create your first tensor and start building neural networks. The key abstractions are Tensors (like NumPy arrays but with GPU support) and nn.Module for building models.",
            "tags": ["PyTorch", "Tutorial", "Deep Learning"]
        },
        {
            "title": "Understanding Transformers",
            "content": "Transformers have revolutionized NLP and beyond. The key innovation is the self-attention mechanism, which allows the model to weigh the importance of different parts of the input. Unlike RNNs, transformers can process all positions in parallel, making them much faster to train.",
            "tags": ["Transformers", "NLP", "Architecture"]
        },
        {
            "title": "AI Ethics Discussion Notes",
            "content": "From our last club meeting: We discussed the importance of considering bias in training data, the need for transparency in AI systems, and the challenge of defining 'fairness' mathematically. Key reading: 'Weapons of Math Destruction' by Cathy O'Neil.",
            "tags": ["Ethics", "Discussion", "Bias"]
        },
        {
            "title": "LangChain for Building LLM Apps",
            "content": "LangChain is an excellent framework for building applications with LLMs. It provides chains for common patterns, memory for conversation context, and agents for more complex reasoning. Great for prototyping RAG applications quickly.",
            "tags": ["LangChain", "LLMs", "Development"]
        },
        {
            "title": "Reinforcement Learning Study Group",
            "content": "Week 3 notes: We covered policy gradient methods including REINFORCE and Actor-Critic. The key insight is that we can optimize policies directly by estimating gradients through sampling. Next week: PPO and TRPO.",
            "tags": ["RL", "Study Group", "Policy Gradients"]
        },
        {
            "title": "Computer Vision Project Ideas",
            "content": "Brainstorming session results: 1) Campus accessibility mapping using object detection, 2) Plant disease detection for the agriculture department, 3) Sign language translation app, 4) Parking lot availability tracker. Voting next meeting!",
            "tags": ["Computer Vision", "Projects", "Ideas"]
        },
        {
            "title": "MLOps Best Practices",
            "content": "Key takeaways from the industry speaker: Version your data AND your models, use feature stores for consistency, monitor model drift in production, and automate retraining pipelines. Tools mentioned: MLflow, DVC, Weights & Biases.",
            "tags": ["MLOps", "Industry", "Best Practices"]
        },
        {
            "title": "Research Paper Review: CLIP",
            "content": "CLIP (Contrastive Language-Image Pre-training) by OpenAI learns visual concepts from natural language supervision. The key idea: train on 400M image-text pairs from the internet using contrastive learning. Enables zero-shot transfer to many vision tasks.",
            "tags": ["Paper Review", "CLIP", "Multimodal"]
        },
        {
            "title": "Hackathon Prep Resources",
            "content": "For the upcoming AI hackathon: Hugging Face for pretrained models, Gradio for quick demos, Colab for free GPUs, Vercel for deployment. Don't forget to prepare your dataset and have a clear problem statement before starting!",
            "tags": ["Hackathon", "Resources", "Tips"]
        },
        {
            "title": "Introduction to JAX",
            "content": "JAX is like NumPy but with automatic differentiation and GPU/TPU support. Key features: `jit` for compilation, `grad` for gradients, `vmap` for vectorization. Used by DeepMind for many research projects. Steeper learning curve than PyTorch but very powerful.",
            "tags": ["JAX", "Tutorial", "Google"]
        },
    ]

    notes = []
    for i, data in enumerate(notes_data):
        # Distribute notes among users
        author = users[i % len(users)]
        note = Note(
            title=data["title"],
            content=data["content"],
            author_id=author.id,
            likes=random.randint(0, 25),
            comments=random.randint(0, 10),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
        )
        note.set_tags_list(data["tags"])
        db.session.add(note)
        notes.append(note)

        # Update author's post count
        author.post_count += 1

    db.session.commit()
    print(f"Created {len(notes)} notes.")
    return notes


def seed_messages(users):
    """Create some sample messages between users."""
    print("Seeding messages...")

    message_templates = [
        "Hey! I saw your post about {}. Would love to chat more about it.",
        "Are you coming to the next club meeting?",
        "Thanks for sharing those resources!",
        "I'm working on a similar project. Want to collaborate?",
        "Great presentation yesterday!",
        "Do you have any tips for getting started with {}?",
        "Let me know if you need help with your research.",
        "The workshop was really helpful, thanks for organizing!",
    ]

    topics = ["transformers", "reinforcement learning", "computer vision", "NLP", "MLOps"]

    messages = []
    # Create 12 messages between random pairs of users
    for _ in range(12):
        sender = random.choice(users)
        recipient = random.choice([u for u in users if u.id != sender.id])

        template = random.choice(message_templates)
        if "{}" in template:
            content = template.format(random.choice(topics))
        else:
            content = template

        msg = Message(
            sender_id=sender.id,
            recipient_id=recipient.id,
            content=content,
            is_read=random.choice([True, False]),
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 168))
        )
        db.session.add(msg)
        messages.append(msg)

    db.session.commit()
    print(f"Created {len(messages)} messages.")
    return messages


def seed_follows(users):
    """Create some follow relationships between users."""
    print("Seeding follow relationships...")

    follows = []
    # Each user follows 2-5 random other users
    for user in users:
        num_following = random.randint(2, 5)
        to_follow = random.sample([u for u in users if u.id != user.id], num_following)

        for followed in to_follow:
            follow = UserFollows(
                follower_id=user.id,
                following_id=followed.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90))
            )
            db.session.add(follow)
            follows.append(follow)

            # Update counts
            user.following_count += 1
            followed.follower_count += 1

    db.session.commit()
    print(f"Created {len(follows)} follow relationships.")
    return follows


def seed_all():
    """Run all seed functions."""
    print("\n" + "="*50)
    print("AIxU Development Seed Data")
    print("="*50 + "\n")

    clear_existing_data()

    universities = seed_universities()
    users = seed_users(universities)
    seed_university_memberships(users, universities)
    seed_notes(users)
    seed_messages(users)
    seed_follows(users)

    print("\n" + "="*50)
    print("Seeding complete!")
    print("="*50)
    print("\nYou can log in with any user using password: password123")
    print("Oliver's account: osto@uoregon.edu / Improve Self3!")
    print("="*50 + "\n")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_all()
