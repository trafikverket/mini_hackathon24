from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

# Replace 'your-api-key' with the actual key you received
api_key = 'a96b7751f502467497ca6ccdad9ee947'
endpoint = 'https://api.trafikinfo.trafikverket.se/v2/data.json'
data_type = 'ReasonCode'
version = '1'

@app.route('/incident/<train_code>', methods=['GET'])
def get_incident(train_code):
    # Construct the XML body for the request
    xml_data = f'''<REQUEST>
        <LOGIN authenticationkey="{api_key}"/>
        <QUERY objecttype="{data_type}" schemaversion="{version}">
            <FILTER></FILTER>
            <INCLUDE>Code</INCLUDE>
            <INCLUDE>GroupDescription</INCLUDE>
            <INCLUDE>Level1Description</INCLUDE>
            <INCLUDE>Level2Description</INCLUDE>
            <INCLUDE>Level3Description</INCLUDE>
            <INCLUDE>Deleted</INCLUDE>
            <INCLUDE>ModifiedTime</INCLUDE>
        </QUERY>
    </REQUEST>'''

    # Set headers to specify the content type is XML
    headers = {
        'Content-Type': 'application/xml'
    }

    try:
        # Send the POST request
        response = requests.post(endpoint, data=xml_data, headers=headers)
        response.raise_for_status()  # Raise an error for bad responses

        # Attempt to parse the response as JSON
        data = response.json()  # Parse JSON response

        # Check for the correct structure
        if 'RESPONSE' in data and 'RESULT' in data['RESPONSE']:
            incidents = []  # List to hold incident data

            for item in data['RESPONSE']['RESULT']:
                if isinstance(item, dict):  # Ensure item is a dictionary
                    # Check if the code matches the train_code
                    reason_codes = item.get("ReasonCode", [])
                    for reason in reason_codes:  # Iterate through each reason code
                        if reason.get("Code") == train_code:
                            # Add matched incident details to the list
                            incident = {
                                "code": reason.get("Code"),
                                "group_description": reason.get("GroupDescription"),
                                "level1_description": reason.get("Level1Description"),
                                "level2_description": reason.get("Level2Description"),
                                "level3_description": reason.get("Level3Description"),
                                "deleted": reason.get("Deleted"),
                                "modified_time": reason.get("ModifiedTime"),
                            }
                            incidents.append(incident)

            if incidents:
                return jsonify(incidents), 200  # Return the incidents as JSON
            else:
                return jsonify({"message": "No incidents found for this train code."}), 404

        else:
            return jsonify({"message": "No incident data found."}), 404

    except requests.exceptions.HTTPError as http_err:
        return jsonify({"error": f"HTTP error occurred: {http_err}"}), 500
    except Exception as err:
        return jsonify({"error": f"An error occurred: {err}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
