# 🔥 Firebase Authentication Configuration Guide

## Issue: auth/configuration-not-found Error

### **Problem Description**
The Forge EC website is experiencing Firebase Authentication errors with the message:
```
FirebaseError: Firebase: Error (auth/configuration-not-found)
```

This error occurs when attempting to sign in or sign up users, indicating that Firebase Authentication is not properly configured in the Firebase Console.

## **Root Cause Analysis**

### **Primary Causes**
1. **Authentication Not Enabled**: Firebase Authentication service is not enabled in the Firebase Console
2. **Missing Sign-in Methods**: Email/Password, Google, and GitHub providers are not configured
3. **Authorized Domains**: Required domains are not added to the authorized domains list
4. **API Key Restrictions**: Firebase API key may have restrictions that prevent authentication

### **Secondary Causes**
- Incorrect Firebase project configuration
- Missing OAuth provider credentials
- Network connectivity issues
- Browser security restrictions

## **Step-by-Step Fix Instructions**

### **Step 1: Access Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **forge-ec** project
3. Navigate to **Authentication** in the left sidebar

### **Step 2: Enable Authentication**
1. Click **Get Started** if Authentication is not yet enabled
2. Go to the **Sign-in method** tab
3. Enable the following providers:

#### **Email/Password Provider**
1. Click on **Email/Password**
2. Toggle **Enable** to ON
3. Click **Save**

#### **Google Provider**
1. Click on **Google**
2. Toggle **Enable** to ON
3. Add project support email: `tanmayspatil2006@gmail.com`
4. Click **Save**

#### **GitHub Provider**
1. Click on **GitHub**
2. Toggle **Enable** to ON
3. You'll need to create a GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App with:
     - Application name: `Forge EC`
     - Homepage URL: `https://tanm-sys.github.io/forge-ec/`
     - Authorization callback URL: `https://forge-ec.firebaseapp.com/__/auth/handler`
   - Copy Client ID and Client Secret to Firebase Console
4. Click **Save**

### **Step 3: Configure Authorized Domains**
1. In Firebase Console > Authentication > Settings
2. Go to **Authorized domains** section
3. Add the following domains:
   - `localhost` (for development)
   - `tanm-sys.github.io` (for GitHub Pages)
   - `forge-ec.firebaseapp.com` (Firebase hosting)
4. Click **Add domain** for each

### **Step 4: Verify API Key Configuration**
1. Go to **Project Settings** (gear icon)
2. Go to **General** tab
3. Scroll down to **Web apps** section
4. Verify the API key matches: `AIzaSyDBG9YcnodA8Lhpwb3wOoyp93VcqXygcrQ`
5. If different, update the configuration in the website code

### **Step 5: Check API Key Restrictions**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the **forge-ec** project
3. Go to **APIs & Services** > **Credentials**
4. Find the API key and click on it
5. Ensure **Application restrictions** allows:
   - HTTP referrers with patterns:
     - `localhost/*`
     - `tanm-sys.github.io/*`
     - `forge-ec.firebaseapp.com/*`
6. Ensure **API restrictions** includes:
   - Identity Toolkit API
   - Firebase Authentication API

## **Testing the Configuration**

### **Using the Diagnostic Tool**
1. Open `firebase-auth-diagnostic.html` in your browser
2. Click **Test Configuration** to verify Firebase setup
3. Click **Test Email Signup** to test authentication
4. Check console logs for detailed error information

### **Manual Testing**
1. Open the main website: `https://tanm-sys.github.io/forge-ec/`
2. Click the **Sign In** button
3. Try creating a new account with email/password
4. Check browser console for any errors

## **Expected Configuration Values**

### **Firebase Project Settings**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDBG9YcnodA8Lhpwb3wOoyp93VcqXygcrQ",
  authDomain: "forge-ec.firebaseapp.com",
  databaseURL: "https://forge-ec-default-rtdb.firebaseio.com",
  projectId: "forge-ec",
  storageBucket: "forge-ec.firebasestorage.app",
  messagingSenderId: "436060720516",
  appId: "1:436060720516:web:4c4ac16371db82fcfd61d1",
  measurementId: "G-1BVB7FLGRJ"
};
```

### **Required APIs to Enable**
- Identity Toolkit API
- Firebase Authentication API
- Firebase Management API (optional)

## **Troubleshooting Common Issues**

### **Issue: "auth/configuration-not-found"**
- **Solution**: Enable Authentication in Firebase Console
- **Check**: Authentication > Sign-in method > Enable Email/Password

### **Issue: "auth/unauthorized-domain"**
- **Solution**: Add domain to authorized domains list
- **Check**: Authentication > Settings > Authorized domains

### **Issue: "auth/api-key-not-valid"**
- **Solution**: Verify API key in Firebase Console matches code
- **Check**: Project Settings > General > Web apps

### **Issue: OAuth providers not working**
- **Solution**: Configure OAuth credentials properly
- **Check**: Authentication > Sign-in method > Provider settings

## **Verification Checklist**

### **Firebase Console Checklist**
- [ ] Authentication service is enabled
- [ ] Email/Password provider is enabled
- [ ] Google provider is enabled (optional)
- [ ] GitHub provider is enabled (optional)
- [ ] Authorized domains include: localhost, tanm-sys.github.io
- [ ] API key matches the one in code

### **Code Checklist**
- [ ] Firebase configuration is correct
- [ ] Authentication methods are properly implemented
- [ ] Error handling includes configuration-not-found case
- [ ] Console logging provides debugging information

### **Testing Checklist**
- [ ] Diagnostic tool shows successful configuration
- [ ] Email signup works without errors
- [ ] Email signin shows appropriate error for non-existent users
- [ ] OAuth providers work (if configured)
- [ ] Error messages are user-friendly

## **Next Steps After Configuration**

1. **Test Authentication Flow**
   - Create test accounts
   - Verify sign-in/sign-out functionality
   - Test password reset (if implemented)

2. **Monitor Usage**
   - Check Firebase Console > Authentication > Users
   - Monitor authentication metrics
   - Review error logs

3. **Security Considerations**
   - Review Firebase Security Rules
   - Implement proper user data protection
   - Consider email verification requirements

## **Support and Resources**

### **Documentation**
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)

### **Contact Information**
- **Project Owner**: Tanmay Patil
- **Email**: tanmayspatil2006@gmail.com
- **GitHub**: [@tanm-sys](https://github.com/tanm-sys)

---

**Last Updated**: December 2024  
**Status**: Configuration Required  
**Priority**: High
