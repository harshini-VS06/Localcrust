# **Local Crust: Artisan Bakery Marketplace**

Local Crust is a cloud-native e-commerce platform that connects local artisan bakers with customers seeking high-quality, handmade goods. Built with a **Flask** backend and a **React.js/Vite** frontend, the platform is hosted on **AWS infrastructure** to provide a scalable and secure ecosystem for community-driven commerce.

## 🚀 Key Features

* **Customer Experience:** Browse a diverse catalog of artisan goods, use search filters to find specific items like Mango cheesecakes, and track orders in real-time.

* **Baker Dashboard:** Specialized portal for home-bakers to manage digital storefronts, upload high-quality product images, and update inventory levels in real-time.

* **Admin Oversight:** Centralized management suite for verifying baker registrations and monitoring sales reports to maintain high-quality standards.

* **Advanced Security:** Features multi-factor authentication (OTP), role-based access control with JWT, and secure payment processing via **Razorpay**.

* **AI-Powered Insights:** Includes an AI service that provides recipe suggestions based on cart items and tailored product recommendations.

* **Automated Notifications:** Event-driven system using **Amazon SNS** to send email confirmations and status updates (e.g., "out for delivery") to users.



## 🏗️ AWS Cloud Architecture

The platform leverages several AWS services to ensure high availability and performance:

* **AWS EC2:** Hosts the Flask backend and React frontend, ensuring the system can handle high traffic during peak hours.

* **AWS DynamoDB:** A high-performance, schemaless database used for multi-table data management (Users, Bakers, Products, Orders, etc.).

* **Amazon SNS:** Manages the event-driven notification system for real-time order alerts.

* **AWS IAM:** Provides granular access control and secure communication between services without hardcoded credentials.


### Prerequisites

* AWS Account with billing configured.

* Python 3 and Node.js (v18.x) installed on your local machine or EC2 instance.

* AWS CLI configured with appropriate permissions.

