# Forge EC Website

A comprehensive, professionally designed website for the Forge EC cryptography library, showcasing both the technical project and the developer's profile.

## Features

### Technical Documentation
- Complete API documentation for the Forge EC library
- Interactive code examples with syntax highlighting
- Performance benchmarks and security features
- Installation and setup guides
- Contribution guidelines and development roadmap

### Personal Profile
- Developer background, skills, and expertise in cryptography
- Project portfolio highlighting Forge EC and other relevant work
- Contact information and professional links

### Design Features
- Modern, responsive design that works on desktop, tablet, and mobile
- Clean, professional visual hierarchy with excellent readability
- Interactive code examples with syntax highlighting
- Dark/light theme toggle
- Fast loading times and optimized performance
- Accessible design following WCAG guidelines

## Technical Implementation

### Technologies Used
- **HTML5**: Semantic markup and modern web standards
- **CSS3**: Custom properties, Grid, Flexbox, and animations
- **JavaScript**: Vanilla JS for interactivity and functionality
- **Prism.js**: Syntax highlighting for code examples
- **Modern Fonts**: Inter for UI text, JetBrains Mono for code

### Key Features
- **Responsive Design**: Mobile-first approach with breakpoints for all devices
- **Theme System**: Light/dark theme with system preference detection
- **Interactive Examples**: Runnable code examples with simulated output
- **Search Functionality**: Full-text search across documentation
- **Performance Optimized**: Minimal dependencies, optimized assets
- **SEO Friendly**: Proper meta tags, structured data, and semantic HTML

## File Structure

```
website/
├── index.html              # Homepage
├── about/
│   └── index.html          # Personal profile page
├── docs/
│   └── index.html          # Documentation hub
├── examples/
│   └── index.html          # Interactive examples
├── css/
│   ├── style.css           # Main stylesheet
│   ├── docs.css            # Documentation styles
│   ├── about.css           # About page styles
│   ├── examples.css        # Examples page styles
│   └── prism.css           # Syntax highlighting
├── js/
│   ├── main.js             # Core functionality
│   ├── docs.js             # Documentation features
│   ├── about.js            # About page interactions
│   ├── examples.js         # Examples functionality
│   └── prism.js            # Syntax highlighting
├── assets/
│   ├── logo.svg            # Forge EC logo
│   └── ...                 # Other assets
└── README.md               # This file
```

## Getting Started

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/tanm-sys/forge-ec.git
   cd forge-ec/website
   ```

2. **Serve locally**:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`

### Deployment

The website is designed to be deployed as a static site. It can be hosted on:

- **GitHub Pages**: Automatic deployment from repository
- **Netlify**: Drag and drop deployment or Git integration
- **Vercel**: Git-based deployment with automatic builds
- **AWS S3**: Static website hosting
- **Any web server**: Standard HTML/CSS/JS files

## Customization

### Themes
The website supports light and dark themes. Theme preferences are:
- Automatically detected from system settings
- Manually toggleable via the theme button
- Persisted in localStorage

### Colors
Color scheme is defined using CSS custom properties in `:root`:
```css
:root {
    --color-primary: #2563eb;
    --color-secondary: #7c3aed;
    --bg-primary: #ffffff;
    --text-primary: #0f172a;
    /* ... */
}
```

### Content
- **Homepage**: Edit `index.html` for hero content and features
- **About**: Update `about/index.html` with personal information
- **Documentation**: Modify `docs/index.html` for API docs
- **Examples**: Add new examples in `examples/index.html`

## Performance

### Optimization Features
- **Minimal Dependencies**: Only essential libraries included
- **Optimized Images**: SVG icons and optimized graphics
- **Efficient CSS**: Modern CSS features for better performance
- **Lazy Loading**: Images and content loaded as needed
- **Caching**: Proper cache headers for static assets

### Lighthouse Scores
The website is optimized for:
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used
- CSS Grid and Flexbox
- CSS Custom Properties
- ES6+ JavaScript
- Intersection Observer API
- Local Storage API

## Contributing

### Adding New Examples
1. Add the example HTML in `examples/index.html`
2. Update the filtering logic in `examples.js`
3. Add appropriate styling in `examples.css`

### Updating Documentation
1. Modify content in `docs/index.html`
2. Update search index in `docs.js`
3. Add new sections to sidebar navigation

### Improving Design
1. Update CSS custom properties for theme changes
2. Modify component styles in respective CSS files
3. Test across different devices and browsers

## License

This website is part of the Forge EC project and is licensed under:
- Apache License, Version 2.0
- MIT License

Choose either license at your option.

## Contact

For questions about the website or Forge EC library:
- **Email**: tanmayspatil2006@gmail.com
- **GitHub**: [@tanm-sys](https://github.com/tanm-sys)
- **Project**: [Forge EC Repository](https://github.com/tanm-sys/forge-ec)

---

Built with ❤️ for the cryptography community.
