# Cafe Finder Web App

This is a simple web application to find nearby cafes using the Google Places API.

## How to Run

1.  **Get a Google Maps API Key**:
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a project and enable **Google Maps JavaScript API** and **Places API**.
    *   Create an API Key.

2.  **Add the API Key**:
    *   Open `index.html` in a text editor (Notepad, VS Code, etc.).
    *   Find the line:
        ```html
        <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"></script>
        ```
    *   Replace `YOUR_API_KEY` with your actual API key.

3.  **Run the App**:
    *   Simply double-click `index.html` to open it in your web browser.
    *   Grant location permissions if asked, or enter a location manually.

## Troubleshooting

*   **Map not showing?** Check if your API key is correct and has billing enabled (Google requires billing for Maps API, though there is a free tier).
*   **"ApiNotActivatedMapError"**: Ensure both the "Maps JavaScript API" and "Places API" are enabled in your Google Cloud Console.
