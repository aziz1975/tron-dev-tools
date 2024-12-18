# TRON Dev Tools

## Overview

The **TRON Dev Tools** is a Next.js application that allows TRON users to simulate and analyze their potential rewards as a Super Representative (SR) or Super Representative Partner (SRP). The app provides details about:

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

- [Node.js](https://nodejs.org/) (version 20 or later recommended)
- [npm](https://www.npmjs.com/)

---

## Setup and Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/aziz1975/tron-dev-tools.git
   cd tron-dev-tools
   ```

2. **Install dependencies:**
It's an NPM project.

   ```bash
   npm install
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

4. **Open the app in your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Project Structure

The project uses the Next.js `app` directory structure. Key files and folders include:

```
├── app
│   ├── sr-simulation/
│   │   ├── SRSimulation.tsx  # Component for SR simulation logic and UI
│   │   ├── page.tsx          # Page file for the SR simulation
│   │   ├── __tests__         # unit tests folder
│   ├── styles.css            # Custom styling for the app
│   ├── page.tsx              # This is the main page to add additional components
├── package.json              # Project dependencies and scripts
├── README.md                 # Documentation
├── public/                   # Static assets (e.g., images, icons)
```

---

## API Integration

### 1. **Tronscan API**

- Endpoint: `https://apilist.tronscanapi.com/api/pagewitness?witnesstype=0`
- Purpose: Fetches real-time vote data for SR and SRP candidates.
- Requires an API key: `TRON-PRO-API-KEY`
- Generate a key in tronscan and create a .env file to store the key in TRON-PRO-API-KEY variable.

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

### Adding a Component and Page

1. **Create a Folder:**

   - Navigate to the `app` directory.
   - Create a new folder based on the purpose of the page, e.g., `my-feature`.

2. **Create the Component File:**

   - Inside the new folder, create a file for your component, e.g., `MyFeature.tsx`.

   - Example:
     ```tsx
     const MyFeature = () => {
       return (
         <div>
           <h2>My New Feature</h2>
         </div>
       );
     };

     export default MyFeature;
     ```

3. **Create the Page File:**

   - In the same folder, create a `page.tsx` file.

   - Example:
     ```tsx
     import MyFeature from './MyFeature';

     const MyPage = () => {
       return (
         <div>
           <h1>Welcome to My Page</h1>
           <MyFeature />
         </div>
       );
     };

     export default MyPage;
     ```

4. **Link to the Main Page:**

   - Update the main `page.tsx` file in the `app` directory to include a link to your new page.

   - Example:
     ```tsx
     import Link from 'next/link';

     const MainPage = () => {
       return (
         <div>
           <h1>Main Page</h1>
           <Link href="/my-feature">Go to My Feature</Link>
         </div>
       );
     };

     export default MainPage;
     ```

5. **Access the New Page:**

   - Start the development server and navigate to `http://localhost:3000/my-feature` or from the main page click on the respective link to view your new page.

---

## Adding Unit Tests

Unit tests are crucial for ensuring the reliability and correctness of your application. This project uses **Jest** and **React Testing Library** for testing.

### Writing Unit Tests

1. **Install dependencies:**

   - Use the following command to install dependencies:
     ```bash
     npm i -D @testing-library/jest-dom @testing-library/react @testing-library/user-event jest jest-environment-jsdom ts-jest
     ```

2. **Create Test Files:**

   - Test files should be named `<ComponentName>.test.tsx`.
   - Example:
     ```
     app/sr-simulation/__test__/SRSimulation.test.tsx
     ```

3. **Run Tests:**

   - Use the following command to execute tests:
     ```bash
     npm test
     ```

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

- **CORS Errors:**
  Ensure the API key is valid for the Tronscan API.
- **Network Issues:**
  Verify network connectivity and ensure endpoints are reachable.
- **Environment Issues:**
  Use Node.js version 20 or later to avoid compatibility issues.

---

## Contributing

1. Fork the repository.
2. Create a new feature branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

---

## Acknowledgments

- [Tronscan API](https://docs.tronscan.org/)
- [CoinGecko API](https://www.coingecko.com/en/api)

---

