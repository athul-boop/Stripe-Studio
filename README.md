# Stripe Studio

## Deploy on Vercel
1. Put these files in a GitHub repo (index.html, package.json, api/presets.js) and import it in Vercel. No build settings needed.
2. In the Vercel project, open Storage, create a Blob store, and connect it to this project. This adds BLOB_READ_WRITE_TOKEN automatically.
3. Optional: under Settings > Environment Variables, add PRESETS_KEY with a team password. People will be asked for it once when they save or delete.
4. If you created the Blob store as private, also add BLOB_ACCESS=private.
5. Redeploy after changing storage or variables.

Saved presets and custom variations are then shared with everyone who opens the tool.
Hidden built-in presets and variations stay per person.
