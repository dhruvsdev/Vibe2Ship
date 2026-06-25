import tkinter as tk
from tkinter import font as tkfont
import urllib.request
import json
import webbrowser
import sys

class GuardianWidget:
    def __init__(self):
        # --- CONFIGURE YOUR FIREBASE UID HERE ---
        self.uid ="jahicyj98uRdIzDMBQeo4jq5WJq2"
        
        # Build the final API URL safely inside the instance
        self.api_url = f"http://localhost:3000/api/widget-tasks?uid={self.uid}"

        self.root = tk.Tk()
        self.root.title("Guardian Copilot")
        
        # Configure window styles: borderless, on-top, and transparent-feeling slate colors
        self.root.overrideredirect(True) # Removes clunky Mac window borders
        self.root.wm_attributes("-topmost", True) # Stays locked on top of pages
        
        # Position widget at top-right of your screen
        screen_width = self.root.winfo_screenwidth()
        self.root.geometry(f"320x220+{screen_width - 340}+60")
        
        # Color Palette (Slate-950 and Indigo accents)
        self.bg_color = "#090d16"
        self.card_bg = "#0f172a"
        self.text_color = "#f1f5f9"
        self.muted_color = "#64748b"
        self.accent_color = "#6366f1"
        
        self.root.configure(bg=self.bg_color)
        
        # Make the widget draggable anywhere on your screen
        self.root.bind("<Button-1>", self.start_drag)
        self.root.bind("<B1-Motion>", self.on_drag)
        
        # Outer border wrapper
        self.outer_frame = tk.Frame(self.root, bg=self.bg_color, bd=1, highlightbackground="#1e293b", highlightthickness=1)
        self.outer_frame.pack(fill=tk.BOTH, expand=True)
        
        # Fonts
        self.header_font = tkfont.Font(family="Helvetica", size=10, weight="bold")
        self.title_font = tkfont.Font(family="Helvetica", size=11, weight="bold")
        self.detail_font = tkfont.Font(family="Helvetica", size=9)
        
        # Header Row
        self.header = tk.Frame(self.outer_frame, bg=self.bg_color)
        self.header.pack(fill=tk.X, padx=12, pady=(12, 6))
        
        self.header_title = tk.Label(self.header, text="🛡️ URGENT DEADLINES", font=self.header_font, fg=self.muted_color, bg=self.bg_color)
        self.header_title.pack(side=tk.LEFT)
        
        # Close Button (✕)
        self.close_btn = tk.Label(self.header, text="✕", font=self.detail_font, fg=self.muted_color, bg=self.bg_color, cursor="hand2")
        self.close_btn.pack(side=tk.RIGHT)
        self.close_btn.bind("<Button-1>", lambda e: sys.exit())
        
        # Tasks Container
        self.list_frame = tk.Frame(self.outer_frame, bg=self.bg_color)
        self.list_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=5)
        
        self.fetch_and_render()
        
        # Auto-refresh task metrics every 60 seconds
        self.root.after(60000, self.auto_refresh)
        
    def start_drag(self, event):
        self.x = event.x
        self.y = event.y

    def on_drag(self, event):
        deltax = event.x - self.x
        deltay = event.y - self.y
        x = self.root.winfo_x() + deltax
        y = self.root.winfo_y() + deltay
        self.root.geometry(f"+{x}+{y}")
        
    def open_dashboard(self, event):
        webbrowser.open("http://localhost:3000/?filter=urgent")
        
    def auto_refresh(self):
        self.fetch_and_render()
        self.root.after(60000, self.auto_refresh)
        
    def fetch_and_render(self):
        # Clear previous rows
        for widget in self.list_frame.winfo_children():
            widget.destroy()
            
        try:
            # Query local Next.js endpoint safely
            req = urllib.request.Request(self.api_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                tasks = json.loads(response.read().decode())
                
            # Safely handle if API returns an error dict instead of a tasks list
            if isinstance(tasks, dict) and "error" in tasks:
                err = tk.Label(self.list_frame, text=tasks["error"], font=self.title_font, fg="#f87171", bg=self.bg_color)
                err.pack(expand=True, pady=30)
                return

            if not tasks or len(tasks) == 0:
                empty = tk.Label(self.list_frame, text="All clear! No urgent tasks.", font=self.title_font, fg=self.muted_color, bg=self.bg_color)
                empty.pack(expand=True, pady=30)
                return
                
            # Render top 3 tasks
            for task in tasks[:3]:
                row = tk.Frame(self.list_frame, bg=self.card_bg, bd=1, highlightbackground="#1e293b", highlightthickness=1)
                row.pack(fill=tk.X, pady=4, ipady=4)
                row.bind("<Button-1>", self.open_dashboard)
                
                # Priority indicator badge
                is_high = task.get("priority") == "High"
                badge_color = "#ef4444" if is_high else "#f59e0b"
                badge_text = "[HIGH]" if is_high else "[TODAY]"
                
                badge = tk.Label(row, text=badge_text, font=self.header_font, fg=badge_color, bg=self.card_bg)
                badge.pack(side=tk.LEFT, padx=(8, 4))
                badge.bind("<Button-1>", self.open_dashboard)
                
                # Task Title
                title_lbl = tk.Label(row, text=task.get("title", "Untitled"), font=self.title_font, fg=self.text_color, bg=self.card_bg, anchor="w")
                title_lbl.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
                title_lbl.bind("<Button-1>", self.open_dashboard)
                
                # Deadline Date & Edit Pencil Icon
                right_frame = tk.Frame(row, bg=self.card_bg)
                right_frame.pack(side=tk.RIGHT, padx=8)
                
                date_lbl = tk.Label(right_frame, text=task.get("deadline", "")[5:], font=self.detail_font, fg=self.muted_color, bg=self.card_bg)
                date_lbl.pack(side=tk.LEFT, padx=4)
                date_lbl.bind("<Button-1>", self.open_dashboard)
                
                edit_lbl = tk.Label(right_frame, text="✎", font=self.title_font, fg=self.accent_color, bg=self.card_bg, cursor="hand2")
                edit_lbl.pack(side=tk.RIGHT, padx=2)
                edit_lbl.bind("<Button-1>", self.open_dashboard)
                
        except Exception as e:
            err = tk.Label(self.list_frame, text="Guardian Server Offline", font=self.title_font, fg=self.muted_color, bg=self.bg_color)
            err.pack(expand=True, pady=30)

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = GuardianWidget()
    app.run()