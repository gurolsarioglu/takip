import fitz

doc = fitz.open("y:/takip/Hammer_Kullanimi.pdf")
text = ""
for page in doc:
    text += page.get_text()

with open("y:/takip/extract_pdf_out.txt", "w", encoding="utf-8") as f:
    f.write(text)

print("Success")
