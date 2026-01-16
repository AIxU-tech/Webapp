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


def compress_banner_image(image_data, output_size=(1500, 300), quality=85):
    """
    Compress and center-crop image to banner aspect ratio (5:1).

    Takes the center portion of the image, crops to 5:1 aspect ratio,
    then resizes to the specified output size.

    Args:
        image_data: Binary image data
        output_size: Tuple of (width, height) for output, default (1500, 300)
        quality: JPEG quality 0-100, default 85

    Returns:
        Compressed JPEG binary data
    """
    try:
        img = Image.open(io.BytesIO(image_data))

        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Calculate crop dimensions for 5:1 aspect ratio (center crop)
        target_ratio = output_size[0] / output_size[1]  # 5.0 for 1500x300
        img_ratio = img.width / img.height

        if img_ratio > target_ratio:
            # Image is wider than target - crop sides
            crop_height = img.height
            crop_width = int(crop_height * target_ratio)
            offset_x = (img.width - crop_width) // 2
            offset_y = 0
        else:
            # Image is taller than target - crop top/bottom
            crop_width = img.width
            crop_height = int(crop_width / target_ratio)
            offset_x = 0
            offset_y = (img.height - crop_height) // 2

        # Crop to target aspect ratio
        img = img.crop((offset_x, offset_y, offset_x + crop_width, offset_y + crop_height))

        # Resize to output size
        img = img.resize(output_size, Image.Resampling.LANCZOS)

        # Save compressed image
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)

        return output.getvalue()
    except Exception as e:
        raise ValueError(f"Error processing banner image: {str(e)}")
