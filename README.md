# How to add content

## Add an experience
Open `_data/experiences.yml`, copy one block, and fill it in:

```yaml
- role: "New Role Title"
  org: "New Organization"
  location: "City, State"
  dates: "Month Year – Month Year"
  link: ""
  bullets:
    - "First accomplishment."
    - "Second accomplishment."
```
It shows up automatically on the Research & Projects page. New entries at the top of the file appear first.

## Add a project
Same idea, in `_data/projects.yml`:

```yaml
- title: "New Project Name"
  tags: "Tech · Stack · Here"
  link: "https://github.com/yourname/repo"
  bullets:
    - "What it does / what you built."
```

## Edit a page's text
Each file in `pages/` (about, contact, thinking, misc) is just the content for that page — no head/nav/footer to worry about, those live once in `_layouts/default.html`.

## Local preview
```
gem install bundler jekyll
bundle init
echo 'gem "jekyll"' >> Gemfile
bundle install
bundle exec jekyll serve
```
Then visit `http://localhost:4000`.

## Deploy on GitHub Pages
Push this folder to a repo named `<username>.github.io`, or enable Pages in repo settings pointing at the branch you push to. If your repo is NOT `<username>.github.io`, set `baseurl: "/your-repo-name"` in `_config.yml`.
