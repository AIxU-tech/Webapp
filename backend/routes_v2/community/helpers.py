from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import json
from backend.extensions import db
from backend.models import Note, User, University


def create_db_note(data):

    note = Note(
        title=data['title'].strip(),
        content=data['content'].strip(),
        author_id=current_user.id
    )

    # Set tags if provided
    tags = data.get('tags', [])
    if tags:
        note.set_tags_list(tags)

    # Save to database
    db.session.add(note)
    db.session.commit()

    return note


def get_db_notes(filter_user_id, search_query):

    if filter_user_id:
        # Fetch only notes from this user
        db_notes = Note.query.filter_by(author_id=filter_user_id).order_by(
            Note.created_at.desc(), Note.id.desc()).all()
    elif search_query:
        # Search in note title, content, and author name
        # Note: username column was removed, search by first/last name and email only
        matching_users = User.query.filter(
            db.or_(
                User.first_name.ilike(f'%{search_query}%'),
                User.last_name.ilike(f'%{search_query}%'),
                User.email.ilike(f'%{search_query}%')
            )
        ).all()
        matching_user_ids = [user.id for user in matching_users]

        # Search for notes by title, content, or author
        db_notes = Note.query.filter(
            db.or_(
                Note.title.ilike(f'%{search_query}%'),
                Note.content.ilike(f'%{search_query}%'),
                Note.author_id.in_(
                    matching_user_ids) if matching_user_ids else False
            )
        ).order_by(Note.created_at.desc(), Note.id.desc()).all()
    else:
        # Fetch all notes from database
        db_notes = Note.query.order_by(
            Note.created_at.desc(), Note.id.desc()).all()

    return db_notes


def notes_to_dict(db_notes, current_user):
    notes = []
    for note in db_notes:
        note_dict = note.to_dict()

        if current_user.is_authenticated:
            # Check if user liked this note
            liked_notes = current_user.liked_notes
            if liked_notes:
                try:
                    liked_list = json.loads(liked_notes)
                    note_dict['isLiked'] = note.id in liked_list
                except:
                    note_dict['isLiked'] = False

            # Check if user bookmarked this note
            bookmarked_notes = current_user.bookmarked_notes
            if bookmarked_notes:
                try:
                    bookmarked_list = json.loads(bookmarked_notes)
                    note_dict['isBookmarked'] = note.id in bookmarked_list
                except:
                    note_dict['isBookmarked'] = False

        notes.append(note_dict)

    return notes


def toggle_like_status(current_user, note):
    note_id = note.id
    liked_notes = current_user.liked_notes
    if liked_notes:
        try:
            liked_list = json.loads(liked_notes)
        except:
            liked_list = []
    else:
        liked_list = []

    # Toggle like
    if note_id in liked_list:
        # Unlike
        liked_list.remove(note_id)
        note.likes = max(0, note.likes - 1)
        is_liked = False
    else:
        # Like
        liked_list.append(note_id)
        note.likes += 1
        is_liked = True

    # Save updated list
    current_user.liked_notes = json.dumps(liked_list)

    db.session.commit()

    return is_liked