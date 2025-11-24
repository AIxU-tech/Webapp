from PIL import Image
import io
from backend.constants import ALLOWED_EXTENSIONS


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def compress_image(image_data, max_size=(800, 800), quality=85):
    """Compress image to reduce file size while maintaining reasonable quality"""
    try:
        # Open image
        img = Image.open(io.BytesIO(image_data))

        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Resize if too large
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Save compressed image
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)

        return output.getvalue()
    except Exception as e:
        raise ValueError(f"Error processing image: {str(e)}")
