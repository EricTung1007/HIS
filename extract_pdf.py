import fitz

def extract_pdf_text(file_path):
    try:
        doc = fitz.open(file_path)
        text = ""
        for i, page in enumerate(doc):
            text += f"--- Page {i+1} ---\n"
            text += page.get_text() + "\n"
        print(text)
    except Exception as e:
        print(f"Error: {e}")

extract_pdf_text("A040170021019100-1071005-1000-003.pdf")
