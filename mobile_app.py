import requests
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.scrollview import ScrollView  # Import ScrollView for scrolling

class IncidentApp(App):
    def build(self):
        self.layout = BoxLayout(orientation='vertical', padding=10, spacing=10)

        # Input field for train code
        self.train_code_input = TextInput(hint_text='Enter Train Code', multiline=False)
        self.train_code_input.bind(on_text_validate=self.fetch_incident)  # Bind Enter key to fetch_incident
        self.layout.add_widget(self.train_code_input)

        # Button to fetch incident
        self.fetch_button = Button(text='Fetch Incident')
        self.fetch_button.bind(on_press=self.fetch_incident)  # Keep the button binding
        self.layout.add_widget(self.fetch_button)

        # Result area
        self.result_layout = BoxLayout(orientation='vertical', size_hint_y=None)
        self.result_layout.bind(minimum_height=self.result_layout.setter('height'))  # Dynamic height based on content

        # ScrollView to allow scrolling through results
        self.scroll_view = ScrollView(size_hint=(1, None), size=(400, 400))  # Adjust size as needed
        self.scroll_view.add_widget(self.result_layout)
        self.layout.add_widget(self.scroll_view)

        return self.layout

    def fetch_incident(self, instance):
        train_code = self.train_code_input.text.strip()  # Strip whitespace
        self.result_layout.clear_widgets()  # Clear previous results

        if train_code:
            response = requests.get(f'http://127.0.0.1:5000/incident/{train_code}')
            if response.status_code == 200:
                incident_data = response.json()
                
                # Display incident data in the result layout
                for incident in incident_data:
                    # Create and add a label for each detail of the incident
                    self.result_layout.add_widget(Label(text=f"Code: {incident['code']}", size_hint_y=None, height=30))
                    self.result_layout.add_widget(Label(text=f"Anledning till försening", size_hint_y=None, height=30))
                     # Add a spacer label for row break
                    self.result_layout.add_widget(Label(text="", size_hint_y=None, height=10))  # Spacer

                    self.result_layout.add_widget(Label(text=f"{incident['level1_description']}", size_hint_y=None, height=30))
                    self.result_layout.add_widget(Label(text=f"{incident['level2_description']}", size_hint_y=None, height=30))
                    self.result_layout.add_widget(Label(text=f"{incident['level3_description']}", size_hint_y=None, height=30))
                    self.result_layout.add_widget(Label(text=f"Modified Time: {incident['modified_time']}", size_hint_y=None, height=30))
                    self.result_layout.add_widget(Label(text="", size_hint_y=None, height=10))  # Spacer between incidents

            elif response.status_code == 404:
                self.result_layout.add_widget(Label(text='No incidents found.', size_hint_y=None, height=30))
            else:
                self.result_layout.add_widget(Label(text='Error fetching data.', size_hint_y=None, height=30))
        else:
            self.result_layout.add_widget(Label(text='Please enter a train code.', size_hint_y=None, height=30))

        self.train_code_input.focus = True 

if __name__ == '__main__':
    IncidentApp().run()
