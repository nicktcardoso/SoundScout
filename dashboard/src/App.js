// Define the backend URL (adjust this based on your actual setup)
const backendUrl = "https://9few96h8ej.execute-api.us-east-1.amazonaws.com/prod";

function redirectToLogin() {
    window.location.href = `${backendUrl}/login`;
}

function redirectToHome() {
  window.location.href = "https://nicktcardoso.com/soundscout";
}

//HTML elements/buttons
const mobileBtn = document.getElementById('mobile-cta')
const nav = document.querySelector('nav')
const mobileBtnExit = document.getElementById('mobile-exit');

mobileBtn.addEventListener('click', () => {
nav.classList.add('menu-btn');
})

mobileBtnExit.addEventListener('click', () => {
nav.classList.remove('menu-btn');
})

function togglePopup(id) {
const popup = document.getElementById(id)
popup.classList.toggle("active");
}

document.addEventListener('keydown', function(event){ 
if (event.key === "Escape") {
    document.getElementById("popup-1").classList.toggle("active")
}
});

document.getElementById('load-artists-btn').addEventListener('click', async function () {
  this.style.display = 'none'; // Hide the button temporarily

  // 🔄 Reparse token from URL in case it's still there
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken) {
    console.log("🔁 Manually grabbed token from URL:", accessToken);
    sessionStorage.setItem("access_token", accessToken);
  }

  if (refreshToken) {
    sessionStorage.setItem("refresh_token", refreshToken);
  }

  // ✅ Then try to fetch artists again
  await fetchTopArtists();

  setTimeout(() => {
    this.style.display = 'inline-block';
  }, 10000);
});


//New Code -> Retrieve tokens from backend



document.addEventListener('DOMContentLoaded', async () => {
  console.log("✅ DOMContentLoaded fired");

  if (window.location.pathname === "/soundscout/dashboard") {
    const params = new URLSearchParams(window.location.search);
    const accessTokenFromUrl = params.get('access_token');
    const refreshTokenFromUrl = params.get('refresh_token');

    if (accessTokenFromUrl) {
      console.log("🎟️ Token found in URL:", accessTokenFromUrl);
      sessionStorage.setItem("access_token", accessTokenFromUrl);
    }

    if (refreshTokenFromUrl) {
      sessionStorage.setItem("refresh_token", refreshTokenFromUrl);
    }

    // 🔁 Retry sessionStorage access if needed
    let retries = 0;
    let token = sessionStorage.getItem("access_token");

    while (!token && retries < 10) {
      console.log(`⏳ Retry ${retries + 1}: Waiting for sessionStorage...`);
      await delay(100);
      token = sessionStorage.getItem("access_token");
      retries++;
    }

    if (token) {
      console.log("✅ Access token available, starting fetchTopArtists");
      await fetchTopArtists();
    } else {
      console.error("❌ Access token is missing after retries.");
    }

    // 🧹 Clean up the URL
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, "/soundscout/dashboard");
    }
  }
});


function getAccessToken() {
  // You can get the token from cookies, localStorage, or a session storage
  // Example: If you store token in cookies
  const token = sessionStorage.getItem("access_token");
  return token;
}

function displayTopItems(data) {
  const list = document.getElementById("artists-list");

  // Clear previous content
  list.innerHTML = '';

  // Display top items (you can adjust this to match the structure of the data)
  data.items.forEach(item => {
    const listItem = document.createElement('li');
    listItem.textContent = item.name; // Assuming 'name' is a property of the item
    list.appendChild(listItem);
  });
}


//New Code 
//----
async function fetchTopArtists() {
  const accessToken = sessionStorage.getItem("access_token");

  try {
    const artistsResponse = await fetch('https://9few96h8ej.execute-api.us-east-1.amazonaws.com/prod/top-items?type=artists&limit=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!artistsResponse.ok) {
      throw new Error(`HTTP error! Status: ${artistsResponse.status}`);
    }

   const artistsData = await artistsResponse.json();

   if (!Array.isArray(artistsData.items)) {
    throw new Error("artistsData.items is not an array");
   }

   const displayedArtists = new Set(); 

    const top10Artists = [];
    
    for (const artist of artistsData.items) {
      if (!displayedArtists.has(artist.id)) {
        displayedArtists.add(artist.id)
        top10Artists.push(artist);
        await fetchNewReleasesForArtist(artist.id, artist.name, accessToken);
        await delay(1);
      }
    }

   const artistList = document.getElementById('artists-list');
   if (top10Artists.length > 0) {
    artistList.innerHTML = top10Artists.slice(0,10).map(artist => {
      const imageUrl = artist.images && artist.images.length > 0 ? artist.images[0].url : 'placeholder.jpg';
      return `
      <div class="artist-card">
          <a href="${artist.external_urls.spotify}" target="_blank">
          <img src="${imageUrl}" alt="${artist.name}" class="artist-image">
             </a> 
             <p class="artist-name"> ${artist.name}</p>
     </div>
      `;
  }).join('');
   }


  } catch (error) {
    console.error('Error fetching artists or new releases: ', error);
  }

}

async function fetchNewReleasesForArtist(artistId, artistName, accessToken) {

  try {
    await delay(1);
    const releasesResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50&offset=0&market=US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (releasesResponse.status === 401) {
      console.warn(`401 Unauthorized for artist ${artistId}. Skipping.`);
      return;
    }

    const releasesData = await releasesResponse.json();

    if (!releasesData.items) {
      console.warn(`Invalid or missing 'items' for artist ${artistId}`, releasesData);
      return;
    }

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentReleases = releasesData.items.filter((release) => {
      const releaseDate = new Date(release.release_date);
      return releaseDate >= twoWeeksAgo;
    });

    displayNewReleasesForArtist(artistName, recentReleases);

  } catch (error) {
    console.error(`Error fetching new releases for artist ${artistId}:`, error);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

   
function displayNewReleasesForArtist(artistName, releases) {
  const releasesContainer = document.getElementById("new-releases-box");

  if (!releases || releases.length === 0) {
    console.log(`No new releases for ${artistName}`);
    return;
  }

  // Check if this artist's section already exists
  const existingSection = Array.from(releasesContainer.children).find(
    (section) => section.querySelector(".artist-name")?.textContent === artistName
  );

  if (existingSection) {
    console.log(`Artist ${artistName} is already displayed.`);
    return;
  }

  // Create a new section for the artist
  const artistSection = document.createElement("div");
  artistSection.classList.add("artist-releases-section");

  // Add the artist name
  const artistHeader = document.createElement("h3");
  artistHeader.classList.add("artist-name");
  artistHeader.textContent = artistName;
  artistSection.appendChild(artistHeader);

  // Create a list to hold the releases
  const releasesList = document.createElement("ul");
  releasesList.classList.add("releases-list");

  // Populate the list with releases
  releases.forEach((release) => {
    const releaseItem = document.createElement("li");
    releaseItem.classList.add("release-item");
  
    releaseItem.innerHTML = `
      <a href="${release.external_urls.spotify}" target="_blank" rel="noopener noreferrer">
        <img src="${release.images[0]?.url || "placeholder.jpg"}" alt="${release.name}" class="release-image">
        <div class="release-details">
          <strong>${release.name}</strong>
          <span>By: ${artistName}</span>
          <span>Released: ${release.release_date}</span>
          <span>Type: ${release.album_type}</span>
        </div>
      </a>
    `;
  
    releasesList.appendChild(releaseItem);
  });

  // Append the releases list to the artist section
  artistSection.appendChild(releasesList);

  // Append the artist section to the main container
  releasesContainer.appendChild(artistSection);
}


  
  