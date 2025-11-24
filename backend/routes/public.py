from flask import Blueprint, render_template, request, flash, redirect, url_for
from backend.utils.email import send_email

public_bp = Blueprint('public', __name__)


@public_bp.route('/')
def index():
    # Redirect to React SPA during migration from Jinja2 templates
    return redirect('/app/')


@public_bp.route('/feedback', methods=['GET', 'POST'])
def feedback():
    if request.method == 'POST':
        sender_email = request.form.get('email', '').strip()
        message_body = request.form.get('message', '').strip()

        if not sender_email or not message_body:
            flash('Please fill out all fields', 'error')
            return render_template('feedback.html')

        subject = "Website Feedback"
        body = f"From: {sender_email}\n\nMessage:\n{message_body}"

        if send_email(subject, body, reply_to=sender_email):
            flash('Your feedback has been sent. Thank you!', 'success')
            return redirect(url_for('public.feedback'))
        else:
            flash('There was an error sending your feedback. Please try again later.', 'error')
            return render_template('feedback.html')

    return render_template('feedback.html')


@public_bp.route('/register_university', methods=['GET', 'POST'])
def register_university():
    if request.method == 'POST':
        sender_email = request.form.get('email', '').strip()
        university_name = request.form.get('university', '').strip()
        message_body = request.form.get('message', '').strip()

        if not sender_email or not university_name or not message_body:
            flash('Please fill out all fields', 'error')
            return render_template('register_university.html')

        subject = f"University Registration: {university_name}"
        body = f"From: {sender_email}\nUniversity: {university_name}\n\nMessage:\n{message_body}"

        if send_email(subject, body, reply_to=sender_email):
            flash('Your registration request has been sent. Thank you!', 'success')
            return redirect(url_for('public.register_university'))
        else:
            flash('There was an error sending your message. Please try again later.', 'error')
            return render_template('register_university.html')

    return render_template('register_university.html')
