from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
import urllib.request
import urllib.parse
import json
from backend.utils.email import send_email
from backend.routes_v2.public.helpers import format_city_results

public_bp = Blueprint('public', __name__)


@public_bp.route('/api/cities/search')
def search_cities():
    """
    Proxy endpoint for city search using Nominatim API.
    Required because Nominatim blocks direct browser requests without proper headers.
    """
    query = request.args.get('q', '').strip()

    if not query or len(query) < 2:
        return jsonify([])

    try:
        # Build URL with query parameters
        params = urllib.parse.urlencode({
            'format': 'json',
            'q': query,
            'addressdetails': 1,
            'limit': 8,
            'countrycodes': 'us',
        })
        url = f'https://nominatim.openstreetmap.org/search?{params}'

        # Create request with proper headers
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'AIxU-University-Platform/1.0 (https://aixu.tech)',
                'Accept-Language': 'en',
            }
        )

        # Make request with timeout
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))

        # Format results
        results = format_city_results(data, max_length=5)

        return jsonify(results)

    except Exception as e:
        print(f"City search error: {e}")
        return jsonify([]), 500


@public_bp.route('/')
def index():
    # Redirect to React SPA during migration from Jinja2 templates
    return redirect('/app')


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
