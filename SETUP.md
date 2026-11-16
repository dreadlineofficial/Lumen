# Setting up Lumen's online features

Accounts, profiles, friends, private chats, rooms, activity sharing and posts all run on **Firebase**. Firebase is Google's free backend, so you don't need a server. Setup takes about 10 minutes and you only do it once. Until it's done, Lumen still works for games, web, study mode, swap and panic.

## 1. Create a Firebase project
1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Create a project**, name it (e.g. `lumen`), and click through. You can turn Google Analytics off.

## 2. Turn on sign-in
1. In the left menu, open **Build → Authentication → Get started**.
2. On the **Sign-in method** tab, enable **Email/Password** and save.
3. (Optional) Enable **Google** too. Pick a support email and save.
4. On the **Settings** tab, open **Authorized domains → Add domain** and add `dreadlineofficial.github.io`. This is the domain your site is served from; without it, Google sign-in is blocked.

## 3. Create the database
1. Open **Build → Firestore Database → Create database**.
2. Pick a location near you, then choose **Start in production mode**.
3. Open the **Rules** tab, delete what's there, and paste in everything from [`firestore.rules`](firestore.rules) in this repo. Click **Publish**.
   These rules make sure only you can edit your profile, only the two people in a private chat can read it, only friends can see each other's activity, and nobody can post as someone else.

## 4. Connect the site to Firebase
1. Click the ⚙ gear next to **Project Overview → Project settings**.
2. Under **Your apps**, click the **`</>`** (Web) icon, name it `Lumen`, and click **Register app**. Don't tick Hosting.
3. Firebase shows a block that looks like this:
   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "lumen-xxxx.firebaseapp.com",
     projectId: "lumen-xxxx",
     storageBucket: "…",
     messagingSenderId: "…",
     appId: "1:…:web:…"
   };
   ```
4. Open [`js/config.js`](js/config.js) in this repo and replace `firebase: null,` with your values:
   ```js
   window.LUMEN_CONFIG = {
     firebase: {
       apiKey: "AIza…",
       authDomain: "lumen-xxxx.firebaseapp.com",
       projectId: "lumen-xxxx",
       storageBucket: "…",
       messagingSenderId: "…",
       appId: "1:…:web:…"
     },
     giphyKey: ""
   };
   ```
   It's fine for this to be public: the Firebase web key only identifies your project, and the rules from step 3 protect the data.
5. Commit the change (on GitHub you can edit the file in the browser with the ✏ pencil icon).

## 5. (Optional) GIF library and YouTube inside Lumen
These keys are set **once for the whole site**. Users never need their own.

**GIFs (GIPHY):**
1. Go to <https://developers.giphy.com>, sign up, and click **Create an App**.
2. Choose **API** (not SDK), give it a name, and create it.
3. Copy the key into `giphyKey: "…"` in `js/config.js`.

**YouTube (browse and search videos inside Lumen):**
1. Go to <https://console.cloud.google.com>. You can pick the project Firebase created (`lumen-…`).
2. Open **APIs & Services → Library**, search for **YouTube Data API v3**, and click **Enable**.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. Click the new key. Under **Application restrictions** choose **Websites** and add `https://dreadlineofficial.github.io/*`. Under **API restrictions** choose **YouTube Data API v3**. Save.
5. Copy the key into `youtubeKey: "…"` in `js/config.js`.

The free YouTube quota allows about 100 searches a day (browsing trending videos costs far less). Pasting a video link always works, even without a key.

**Google sign-in for YouTube (subscriptions, liked videos, playlists):**
1. In <https://console.cloud.google.com>, pick the same project, then open **Google Auth Platform** (search "OAuth consent" if you can't find it) and click **Get started**.
2. **App name** `Lumen`, your email as the support email, **Audience: External**, your email again as the contact, then **Create**.
3. Go to **Data access → Add or remove scopes**, search for `youtube.readonly`, tick it, then **Update** and **Save**.
4. Go to **Audience → Test users → Add users** and add the Google accounts that should be able to sign in (up to 100 while the app is in testing).
5. Go to **Clients → Create client**. Pick **Web application** and name it `Lumen`. Under **Authorized JavaScript origins** add `https://dreadlineofficial.github.io` (no slash or path at the end). Click **Create**.
6. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`) into `googleClientId: "…"` in `js/config.js`.

People see a "Google hasn't verified this app" screen until you submit the app for Google's review. Testers click **Continue** to get past it. Access is read-only, and the sign-in lasts until the tab is closed.

## 6. Put it online
In the Lumen repo on GitHub, open **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**. A minute later the site is live at `https://dreadlineofficial.github.io/Lumen/`.

## Using it
- Click **Sign in** at the bottom-left to create an account. Click your name to change your picture, description and privacy settings.
- **Friends:** search by name, send a request, and accept requests on the Friends page. Click a friend there to open your private chat; their profile shows on the right. A green dot means online, yellow means idle (Lumen open in a background tab), and grey shows when they were last seen.
- **Activity:** in your profile you choose what friends can see (the game you're playing, the YouTube video you're watching, the site you have open) and whether you see theirs. Study mode and panic always hide your activity.
- **Posts:** write something, add an image if you like, and others can comment with text or GIFs. You can delete your own posts, and comments on them.

## Free limits
The free Firebase plan allows about 50,000 reads and 20,000 writes per day, which is plenty for a group of friends. If you ever hit it, things pause until the next day; nothing is charged unless you upgrade.
