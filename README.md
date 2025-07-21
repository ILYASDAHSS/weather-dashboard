# 🌤️ Weather Dashboard

A Node.js + Express.js server that provides weather data using the OpenWeatherMap API. Supports weather search by **city name** or **geographic coordinates**, includes basic **rate limiting** and **caching**.

---

## 🚀 Features

- 🔍 Search weather by **city name** or **coordinates**
- ⚡ Fast responses using in-memory **caching**
- 🛡️ Basic **rate limiting** to protect the server
- 🔐 Uses `.env` for sensitive API keys
- 🌐 Simple frontend served from `public/index.html`

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- Axios
- OpenWeatherMap API
- dotenv

---

## 📦 Installation

```bash
git clone https://github.com/YOUR_USERNAME/weather-dashboard.git
cd weather-dashboard
npm install
⚙️ Setup
Create a .env file in the root:

env
Copier
Modifier
PORT=3000
OPENWEATHER_API_KEY=your_api_key_here
Start the server:

bash
Copier
Modifier
node index.js
Open your browser at:

arduino
Copier
Modifier
http://localhost:3000
🧪 API Endpoints
Method	Endpoint	Description
GET	/api/weather/:city	Weather by city name
GET	/api/weather/coordinates/:lat/:lon	Weather by latitude/longitude
GET	/api/health	Server health check

📁 Folder Structure
csharp
Copier
Modifier
weather-dashboard/
├── public/            # Static frontend (HTML, CSS, JS)
├── .env.example       # Example environment config
├── .gitignore
├── index.js           # Main server file
├── package.json
✅ Example Usage
bash
Copier
Modifier
GET /api/weather/London
GET /api/weather/coordinates/34.05/-118.25
🧾 License
This project is licensed under the MIT License.

🌟 Author
Made with ❤️ by @YOUR_USERNAME

yaml
Copier
Modifier

---

### ✅ Replace:
- `YOUR_USERNAME` with your GitHub username.
- `index.js` with your server file name (if different).
- Add badges or links if you're deploying the app.

Want me to include a live demo link or deployment instructions for Vercel/Render too?
