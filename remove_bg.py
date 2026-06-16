from PIL import Image
import sys

try:
    img = Image.open('logo.png').convert("RGBA")
    datas = img.getdata()
    
    # Get top-left pixel color
    bg_color = datas[0]
    
    newData = []
    for item in datas:
        # If pixel is close to bg_color, make it transparent
        if abs(item[0]-bg_color[0]) < 20 and abs(item[1]-bg_color[1]) < 20 and abs(item[2]-bg_color[2]) < 20:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save("ghost.png", "PNG")
    print("Background removed successfully.")
except Exception as e:
    print(f"Error: {e}")
