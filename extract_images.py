import fitz
import os

pdf_path = "y:/takip/Hammer_Kullanimi.pdf"
output_dir = "y:/takip/pdf_images"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

doc = fitz.open(pdf_path)
count = 0

for page_index in range(len(doc)):
    page = doc[page_index]
    image_list = page.get_images(full=True)
    
    for img_index, img in enumerate(image_list):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        
        count += 1
        image_name = f"image_{count}.{image_ext}"
        filepath = os.path.join(output_dir, image_name)
        
        with open(filepath, "wb") as f:
            f.write(image_bytes)

print(f"Extracted {count} images to {output_dir}")
