# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- **Advanced Animation Controls:** The "Create Animation" step has been completely overhauled. It now features six specific animation presets (e.g., '360 Spin', 'Walking') and a text input for custom user-defined animations, providing much greater creative control.
- **Undo/Redo Functionality:** Implemented a full undo/redo history for all actions within the editor, allowing users to step backward and forward through their changes.
- **Aspect Ratio Selection:** Added an aspect ratio selector ('9:16 Portrait', '16:9 Landscape') to the animation and scene generation steps.
- **Enhanced UI Feedback:**
  - Replaced simple confirmation alerts with non-intrusive "toast" notifications for actions like saving a project.
  - Added descriptive tooltips on hover to all header icons and buttons for better user guidance.
  - Implemented more specific, granular loading messages for each stage of the generation process.
- **Save Video Frame:** Added a button to the canvas that allows users to capture and download the current frame of an animated video as a static PNG image.

### Changed
- **CRITICAL WORKFLOW FIX:** The "Place in Scene" (Step 4) logic has been re-engineered. It now intelligently combines the animation style chosen in Step 3 with the new scene description, ensuring a logical and seamless creative process. Previously, the chosen animation was completely ignored.
- **Animation Model Refinement:** The AI prompts for animation and scene generation have been updated to specify a "well-built male model with a manly chest" to ensure the garment drapes and moves with a masculine physique, as requested.
- **Homepage Layout:** Corrected the homepage layout by removing all excess top padding, moving the hero content flush against the header as repeatedly requested.
- **Branding:** Replaced the placeholder SVG logo with the user's company logo in the application headers.
- **Homepage Hero Media:** Replaced the static hero image with a looping MP4 video to better showcase the product's capabilities. Added instructions for connecting to a Supabase-hosted video file.
- **Major UI/UX Overhaul:** Replaced the cluttered, multi-tool sidebar with a clean, guided, step-by-step workflow (Upload -> Flat Lay -> Animate -> Scene). This provides a more intuitive and efficient user experience.
- **Flat Lay Generation:** The flat lay process now generates 4 distinct, high-resolution options from the user's uploaded image, allowing for greater creative choice.
- **Streamlined Tooling:** Removed initial image/video generation from text, focusing the app's core purpose on transforming user-uploaded product images.

### Removed
- **Social Proof Element:** Removed the "Join 120,000+ brands..." element from the homepage to create a cleaner design for a private application.

### Fixed
- **Editor Scrolling & Responsiveness:** Enabled vertical scrolling in the editor and made the generated image grid responsive. This fixes the critical issue where users could not view all 4 flat lay options on smaller screens.
- **CODE RED: Critical File Upload Failure (Root Cause Fixed):** Re-architected the undo/redo state management hook (`useHistoryState`) from the ground up. The previous implementation was unstable and would incorrectly trigger a full reset of the editor state immediately after a successful file upload, causing the image to disappear. The new implementation is robust, stable, and completely resolves this show-stopping bug.
- **Hero Logo Size:** Correctly increased the main hero logo size by 4x after previous failed attempts. The logo is now prominently displayed as requested.
- **API Call Resiliency:** Implemented an automatic retry mechanism with exponential backoff for API calls to handle transient server errors (like `503 Service Unavailable`) more gracefully.
- User login sessions now persist after closing the browser by switching session management from `sessionStorage` to `localStorage`.
- Replaced the unreliable browser `prompt()` with a custom modal for a smoother project saving experience.

## Initial Release

### Added
- **Core Application Structure:** Set up the initial React application with Tailwind CSS for styling.
- **AI-Powered Design Tools:**
  - **Flat Lay Generation:** Transform a single product image into a 4K flat lay image.
  - **Image Editing:** Edit images using natural language text prompts.
  - **Video Generation:** Create videos from text prompts or by animating an existing image using Veo.
- **Responsive UI:** Designed a modern, responsive interface for both desktop and mobile browsers.
- **Component-Based Architecture:** Organized the application into reusable components for the sidebar, canvas, loaders, and modals.
- **Gemini & Veo Service Integration:** Created a dedicated service to handle all API interactions with Google's Gemini and Veo models.
- **User and Project Services:** Implemented services to handle simulated user and project data management using browser storage.