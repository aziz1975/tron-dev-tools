# SR / SRP Rewards Simulator

## Overview
The **SR / SRP Rewards Simulator** is a Next.js application that allows TRON users to simulate and analyze their potential rewards as a Super Representative (SR) or Super Representative Partner (SRP). The app provides details about:

- Votes needed to become an SR or SRP.
- Daily and monthly rewards, including block rewards and vote rewards (before and after brokerage deduction).

This application uses the Tronscan and CoinGecko APIs to fetch real-time data.

---

## Features
- Calculate votes required to become an SR or SRP.
- Display rewards before and after brokerage deduction.
- Real-time integration with:
  - **Tronscan API**: Fetches SR and SRP rankings and vote data.
  - **CoinGecko API**: Fetches the current TRX to USD price.

---

## Prerequisites
Ensure the following are installed:

- [Node.js](https://nodejs.org/) (version 16 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

---

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   Or, if using yarn:
   ```bash
   yarn install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Or, if using yarn:
   ```bash
   yarn dev
   ```

4. **Open the app in your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Project Structure

The project uses the Next.js `app` directory structure (no `src` folder). Key files and folders include:

```
├── app
│   ├── page.tsx         # Main application logic and UI
│   ├── styles.css       # Custom styling for the app
├── package.json         # Project dependencies and scripts
├── README.md            # Documentation
```

---

## API Integration

### 1. **Tronscan API**
   - Endpoint: `https://apilist.tronscanapi.com/api/pagewitness?witnesstype=0`
   - Purpose: Fetches real-time vote data for SR and SRP candidates.
   - Requires an API key: `TRON-PRO-API-KEY`

### 2. **CoinGecko API**
   - Endpoint: `https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd`
   - Purpose: Fetches the current TRX to USD price.

---

## Usage

1. Enter your TRON wallet address in the input field.
2. Click the "Simulate" button to calculate:
   - Votes needed to become an SR or SRP.
   - Daily and monthly rewards, broken down into block and vote rewards (before and after brokerage deduction).

---

## Styling
The application uses a combination of inline styles and a `styles.css` file for custom UI design. Modify `app/styles.css` to customize the appearance further.

---

## Adding a New Component/Page

If you want to add a new component or page to the application, follow these steps:

### Adding a Component
1. **Create the Component File**:
   - Navigate to the `app` directory.
   - Create a new file for your component, e.g., `MyComponent.tsx`.

2. **Write the Component Logic**:
   - Use the React functional component structure. Example:
     ```tsx
     const MyComponent = () => {
       return (
         <div>
           <h2>My New Component</h2>
         </div>
       );
     };

     export default MyComponent;
     ```

3. **Import and Use the Component**:
   - Import the new component into `page.tsx` or any other existing component/page:
     ```tsx
     import MyComponent from './MyComponent';
     
     const Page = () => {
       return (
         <div>
           <MyComponent />
         </div>
       );
     };
     ```

### Adding a New Page
1. **Create the Page File**:
   - Navigate to the `app` directory.
   - Create a folder with the name of the page, e.g., `my-page`, and add an `page.tsx` file inside it:
     ```
     app/
     ├── my-page/
         ├── page.tsx
     ```

2. **Write the Page Logic**:
   - Write your React functional component inside `page.tsx`. Example:
     ```tsx
     const MyPage = () => {
       return (
         <div>
           <h1>Welcome to My Page</h1>
         </div>
       );
     };

     export default MyPage;
     ```

3. **Access the Page**:
   - Start the development server and navigate to `http://localhost:3000/my-page` to view your new page.

---

## Scripts

### Available npm scripts:

- **`dev`**: Runs the development server.
  ```bash
  npm run dev
  ```

- **`build`**: Builds the app for production.
  ```bash
  npm run build
  ```

- **`start`**: Starts the production server.
  ```bash
  npm run start
  ```

---

## Troubleshooting

- **CORS Errors**:
  Ensure the API key is valid for the Tronscan API.
- **Network Issues**:
  Verify network connectivity and ensure endpoints are reachable.
- **Environment Issues**:
  Use Node.js version 16 or later to avoid compatibility issues.

---

## Contributing

1. Fork the repository.
2. Create a new feature branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

---

---

## Acknowledgments
- [Tronscan API](https://docs.tronscan.org/)
- [CoinGecko API](https://www.coingecko.com/en/api)

---


