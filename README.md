# ShelfMaster Pro

## Overview

ShelfMaster Pro is a comprehensive inventory management system designed to help businesses efficiently track, organize, and manage their inventory. Built as a web application, it provides an intuitive interface for managing items, locations, categories, movements, and generating reports. The system includes user authentication to ensure secure access and data protection.

## Features

- **Dashboard**: Get an overview of your inventory status with key metrics and insights.
- **Items Management**: Add, edit, delete, and search for inventory items with detailed information.
- **Locations**: Organize items by physical or virtual locations within your facility.
- **Categories**: Classify items into categories for better organization and reporting.
- **Movements**: Track item movements, including stock in/out, transfers, and adjustments.
- **Reports**: Generate detailed reports on inventory levels, movements, and analytics.
- **User Authentication**: Secure login and registration system to protect your data.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL database, authentication, and real-time features)
- **Libraries**: Font Awesome for icons, Google Fonts for typography
- **Styling**: Custom CSS with modern design principles

## Installation and Setup

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Supabase integration
- A Supabase account and project (for database and authentication)

### Steps

1. **Clone the Repository**:
   ```
   git clone https://github.com/yourusername/shelfmater-pro.git
   cd shelfmaster-pro
   ```

2. **Set Up Supabase**:
   - Create a new project on [Supabase](https://supabase.com)
   - In your Supabase dashboard, go to the SQL Editor
   - Run the following SQL script to create the necessary database tables:

     ```sql
     -- Create users table
     CREATE TABLE users (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         name TEXT NOT NULL,
         email TEXT UNIQUE NOT NULL,
         role TEXT DEFAULT 'Employee',
         created_at TIMESTAMP DEFAULT NOW()
     );

     -- Create categories table
     CREATE TABLE categories (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         name TEXT NOT NULL,
         description TEXT,
         created_at TIMESTAMP DEFAULT NOW()
     );

     -- Create locations table
     CREATE TABLE locations (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         name TEXT NOT NULL,
         description TEXT,
         parent_location_id UUID REFERENCES locations(id),
         created_at TIMESTAMP DEFAULT NOW()
     );

     -- Create items table
     CREATE TABLE items (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         name TEXT NOT NULL,
         description TEXT,
         category_id UUID REFERENCES categories(id),
         location_id UUID REFERENCES locations(id),
         quantity INTEGER DEFAULT 1,
         condition TEXT,
         purchase_date DATE,
         value DECIMAL(10,2),
         serial_number TEXT,
         barcode TEXT,
         notes TEXT,
         created_at TIMESTAMP DEFAULT NOW(),
         updated_at TIMESTAMP DEFAULT NOW()
     );

     -- Create movements table
     CREATE TABLE movements (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         item_id UUID REFERENCES items(id),
         from_location UUID REFERENCES locations(id),
         to_location UUID REFERENCES locations(id),
         quantity INTEGER NOT NULL,
         moved_by UUID REFERENCES users(id),
         moved_at TIMESTAMP DEFAULT NOW(),
         notes TEXT
     );

     -- Create audit_logs table
     CREATE TABLE audit_logs (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         user_id UUID REFERENCES users(id),
         action TEXT NOT NULL,
         table_name TEXT NOT NULL,
         record_id UUID,
         timestamp TIMESTAMP DEFAULT NOW()
     );
     ```

   - Configure authentication settings in Supabase (enable email/password auth)
   - Note your project URL and API key from the project settings

3. **Configure the Application**:
   - Open `js/api.js`
   - Replace the placeholder Supabase URL and API key with your actual credentials

4. **Run the Application**:
   - Open `index.html` in your web browser
   - Register a new account or log in with existing credentials

## Usage

1. **Authentication**: Start by registering a new account or logging in.
2. **Dashboard**: View summary statistics and recent activities.
3. **Managing Items**: Navigate to the Items section to add new items, update quantities, or search existing ones.
4. **Organizing Locations**: Define and manage storage locations.
5. **Categorizing Items**: Create categories to group similar items.
6. **Tracking Movements**: Record all inventory movements for audit trails.
7. **Generating Reports**: Access the Reports section for data analysis and exports.

## Project Structure

```
shelfmater-pro/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Application styles
├── js/
│   ├── api.js          # Supabase API integration
│   ├── components.js   # UI components and utilities
│   └── app.js          # Main application logic
└── README.md           # Project documentation
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors

Made by Rafael Fonseca, Daniel Gavasso, and Santiago Capitão - 2026