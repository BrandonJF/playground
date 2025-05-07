const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const httpProxy = require('http-proxy');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const proxy = httpProxy.createProxyServer();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow Vite dev server origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'dist' directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Proxy requests to the Vite dev server during development
if (process.env.NODE_ENV !== 'production') {
  app.use('/', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Forward other requests to the Vite dev server
    proxy.web(req, res, { target: 'http://localhost:5173' });
  });
}

// API endpoint to get the spice list
app.get('/api/spices', (req, res) => {
  try {
    const spiceListPath = path.join(__dirname, 'public', 'spicelist.md');
    const spiceContent = fs.readFileSync(spiceListPath, 'utf8');
    res.json({ success: true, data: spiceContent });
  } catch (error) {
    console.error('Error reading spice list:', error);
    res.status(500).json({ success: false, error: 'Failed to read spice list' });
  }
});

// API endpoint to submit a custom spice - now with auto-approval
app.post('/api/spices/submit', (req, res) => {
  try {
    const { name, category } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Define the possible locations for the spice list file
    const possiblePaths = [
      path.join(__dirname, 'public', 'spicelist.md'),
      path.join(__dirname, 'src', 'spice', 'spicelist.md')
    ];
    
    // Find which path exists and is readable
    let spiceListPath = null;
    let spiceContent = null;
    
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          spiceContent = fs.readFileSync(testPath, 'utf8');
          spiceListPath = testPath;
          console.log(`Found spicelist.md at: ${spiceListPath}`);
          break;
        }
      } catch (err) {
        console.log(`Could not read file at: ${testPath}`);
      }
    }
    
    // If we couldn't find a valid file, return an error
    if (!spiceListPath || !spiceContent) {
      console.error('Could not find spicelist.md at any of the expected locations');
      return res.status(404).json({
        success: false,
        error: 'Spice list file not found'
      });
    }
    
    // Check if the spice already exists in the list
    // Use a more precise check - look for the exact spice name
    const spiceLines = spiceContent.split('\n');
    const exactMatchExists = spiceLines.some(line => {
      const trimmedLine = line.trim();
      return (
        trimmedLine === name || 
        trimmedLine === `${name},` || 
        trimmedLine.startsWith(`${name},`)
      );
    });
    
    if (exactMatchExists) {
      console.log(`Exact match found for "${name}" in the spice list`);
      return res.json({
        success: true,
        message: 'Spice already exists in the list',
        status: 'exists'
      });
    }
    
    // Add the new spice to the appropriate category section
    const categoryChar = category.toUpperCase();
    
    // Improved regex pattern to better match category headings
    // This will match the category letter at the beginning of a line, 
    // even if there's whitespace after it
    const categoryRegex = new RegExp(`^${categoryChar}\\s*$`, 'm');
    
    // Debug information
    console.log(`Looking for category: ${categoryChar}`);
    console.log(`Category regex: ${categoryRegex}`);
    console.log(`Category exists in file: ${categoryRegex.test(spiceContent)}`);
    
    // Find the exact position of the category
    const categoryMatch = spiceContent.match(categoryRegex);
    if (categoryMatch) {
      const categoryPosition = categoryMatch.index;
      console.log(`Found category at position: ${categoryPosition}`);
      
      // Find the position right after the category heading (after the newline)
      const insertPosition = categoryPosition + categoryChar.length;
      const beforeInsert = spiceContent.substring(0, insertPosition);
      const afterInsert = spiceContent.substring(insertPosition);
      
      // Insert the new spice right after the category heading
      spiceContent = beforeInsert + `\n${name}` + afterInsert;
      console.log(`Added "${name}" after category ${categoryChar}`);
    } else {
      // If the category doesn't exist, add it to the end
      spiceContent += `\n\n${categoryChar}\n${name}`;
      console.log(`Added new category ${categoryChar} with spice "${name}"`);
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(spiceListPath, spiceContent);
    console.log(`Updated spice list at: ${spiceListPath}`);
    
    // For tracking purposes, still record in submissions.json
    const submissionsPath = path.join(__dirname, 'submissions.json');
    let submissions = [];
    
    try {
      if (fs.existsSync(submissionsPath)) {
        submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error reading submissions file:', error);
    }
    
    // Add or update the submission with auto-approved status
    const submissionIndex = submissions.findIndex(s => s.name === name);
    if (submissionIndex >= 0) {
      submissions[submissionIndex] = {
        name,
        category,
        status: 'approved',
        submittedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      };
    } else {
      submissions.push({
        name,
        category,
        status: 'approved',
        submittedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      });
    }
    
    fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Spice automatically added to the list',
      status: 'approved'
    });
  } catch (error) {
    console.error('Error submitting spice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit spice: ' + error.message
    });
  }
});

// API endpoint to approve a submitted spice and add it to the markdown file
app.post('/api/spices/approve', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing spice name' 
      });
    }
    
    // Read the submissions file
    const submissionsPath = path.join(__dirname, 'submissions.json');
    if (!fs.existsSync(submissionsPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'No submissions found' 
      });
    }
    
    const submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
    
    // Find the submission to approve
    const submissionIndex = submissions.findIndex(s => s.name === name);
    if (submissionIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Submission not found' 
      });
    }
    
    const submission = submissions[submissionIndex];
    
    // Read the spice list markdown file
    const spiceListPath = path.join(__dirname, 'public', 'spicelist.md');
    let spiceContent = fs.readFileSync(spiceListPath, 'utf8');
    
    // Add the new spice to the appropriate category section
    const category = submission.category.toUpperCase();
    const categoryRegex = new RegExp(`^${category}\\s*$`, 'm');
    
    if (categoryRegex.test(spiceContent)) {
      // If the category exists, add the spice after the category heading
      spiceContent = spiceContent.replace(
        categoryRegex,
        `${category}\n${submission.name}`
      );
    } else {
      // If the category doesn't exist, add it to the end
      spiceContent += `\n\n${category}\n${submission.name}`;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(spiceListPath, spiceContent);
    
    // Update the submission status
    submissions[submissionIndex].status = 'approved';
    submissions[submissionIndex].approvedAt = new Date().toISOString();
    fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Spice approved and added to the list' 
    });
  } catch (error) {
    console.error('Error approving spice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve spice' 
    });
  }
});

// API endpoint to get all submissions
app.get('/api/submissions', (req, res) => {
  try {
    const submissionsPath = path.join(__dirname, 'submissions.json');
    
    if (!fs.existsSync(submissionsPath)) {
      return res.json({ success: true, data: [] });
    }
    
    const submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Error reading submissions:', error);
    res.status(500).json({ success: false, error: 'Failed to read submissions' });
  }
});

// API endpoint to save user inventory data
app.post('/api/inventory/save', (req, res) => {
  try {
    const { userId, data } = req.body;
    
    if (!userId || !data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Create directory if it doesn't exist
    const inventoryDir = path.join(__dirname, 'inventory');
    if (!fs.existsSync(inventoryDir)) {
      fs.mkdirSync(inventoryDir);
    }
    
    // Save inventory data to a file named with the userId
    const inventoryPath = path.join(inventoryDir, `${userId}.json`);
    fs.writeFileSync(inventoryPath, JSON.stringify(data, null, 2));
    
    console.log(`Saved inventory for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'Inventory saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving inventory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save inventory: ' + error.message
    });
  }
});

// API endpoint to load user inventory data
app.get('/api/inventory/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing user ID' 
      });
    }
    
    const inventoryPath = path.join(__dirname, 'inventory', `${userId}.json`);
    
    // Check if inventory file exists
    if (!fs.existsSync(inventoryPath)) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'No inventory found for this user'
      });
    }
    
    // Read and return the inventory data
    const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    
    console.log(`Loaded inventory for user ${userId}`);
    
    res.json({ 
      success: true, 
      data: inventoryData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading inventory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load inventory: ' + error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- API available at http://localhost:${PORT}/api`);
  console.log(`- Static files served from 'public' directory`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`- Frontend dev server proxy: http://localhost:5173 -> http://localhost:${PORT}`);
  }
});