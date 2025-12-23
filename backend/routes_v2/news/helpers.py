

def validate_request_data(data):
    """
    A simple helper to checks to see if the data exists and if it holds a message field
    """
    if not data:
        return "Request body required", 400

    message = data.get('message', '').strip()
    if not message:
        return "Message is required", 400

    else:
        return None, None
