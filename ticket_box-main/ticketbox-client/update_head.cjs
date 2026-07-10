const fs = require('fs');
const files = ['event.html', 'checkout.html', 'payment.html', 'seat.html', 'index.html'];

const headContent = `
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <title>Ticketbox</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet">
    <script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-tertiary": "#520070",
                        "tertiary": "#edb1ff",
                        "surface-dim": "#131313",
                        "surface-bright": "#393939",
                        "primary-container": "#26bc8a",
                        "tertiary-container": "#d886f5",
                        "surface": "#131313",
                        "on-surface": "#e5e2e1",
                        "primary-fixed": "#74fac4",
                        "on-tertiary-fixed-variant": "#6e208c",
                        "secondary-fixed-dim": "#e9c400",
                        "on-secondary-container": "#725f00",
                        "on-secondary": "#3a3000",
                        "secondary-container": "#ffdb3c",
                        "surface-container-highest": "#353535",
                        "outline-variant": "#3d4a42",
                        "secondary-fixed": "#ffe16d",
                        "surface-variant": "#353535",
                        "surface-container-high": "#2a2a2a",
                        "on-primary-fixed-variant": "#005139",
                        "surface-container-lowest": "#0e0e0e",
                        "tertiary-fixed": "#f9d8ff",
                        "surface-container": "#20201f",
                        "on-surface-variant": "#bbcac0",
                        "error-container": "#93000a",
                        "on-tertiary-fixed": "#320046",
                        "secondary": "#fff9ef",
                        "error": "#ffb4ab",
                        "on-secondary-fixed-variant": "#544600",
                        "on-primary": "#003826",
                        "on-background": "#e5e2e1",
                        "on-secondary-fixed": "#221b00",
                        "inverse-surface": "#e5e2e1",
                        "primary-fixed-dim": "#54dda9",
                        "inverse-primary": "#006c4c",
                        "background": "#131313",
                        "on-error-container": "#ffdad6",
                        "outline": "#86948b",
                        "on-primary-fixed": "#002115",
                        "primary": "#54dda9",
                        "inverse-on-surface": "#313030",
                        "on-tertiary-container": "#611080",
                        "on-primary-container": "#004530",
                        "surface-container-low": "#1c1b1b",
                        "tertiary-fixed-dim": "#edb1ff",
                        "surface-tint": "#54dda9",
                        "on-error": "#690005"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "container-max": "1200px",
                        "base": "4px",
                        "margin-mobile": "16px",
                        "margin-desktop": "64px",
                        "gutter": "24px"
                    },
                    "fontFamily": {
                        "headline-lg-mobile": ["Hanken Grotesk"],
                        "body-sm": ["Inter"],
                        "headline-lg": ["Hanken Grotesk"],
                        "headline-md": ["Hanken Grotesk"],
                        "body-lg": ["Inter"],
                        "label-md": ["Inter"],
                        "body-md": ["Inter"]
                    },
                    "fontSize": {
                        "headline-lg-mobile": ["24px", {"lineHeight": "30px", "fontWeight": "700"}],
                        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                        "headline-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
                        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
                        "label-md": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600"}],
                        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
    <style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .ticket-stub-mask {
            mask-image: radial-gradient(circle at 0% 50%, transparent 12px, black 13px), radial-gradient(circle at 100% 50%, transparent 12px, black 13px);
            mask-composite: intersect;
        }
        .notch-left {
            position: absolute;
            left: -12px;
            top: 50%;
            transform: translateY(-50%);
            width: 24px;
            height: 24px;
            background: #131313;
            border-radius: 50%;
        }
        .notch-right {
            position: absolute;
            right: -12px;
            top: 50%;
            transform: translateY(-50%);
            width: 24px;
            height: 24px;
            background: #131313;
            border-radius: 50%;
        }
        .glass-effect {
            backdrop-filter: blur(12px);
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    let html = fs.readFileSync(f, 'utf8');
    html = html.replace(/<head>.*?<\/head>/is, '<head>' + headContent + '</head>');
    fs.writeFileSync(f, html);
    console.log('Updated ' + f);
  }
});
