export function updateButtons(activeSlide) {
  const block = activeSlide.closest('.block');
  const buttons = block.closest('.cf-carousel-wrapper').querySelector('.cf-carousel-buttons');

  const nthSlide = activeSlide.offsetLeft / activeSlide.parentNode.clientWidth;
  const button = block.parentElement.querySelector(`.cf-carousel-buttons > button:nth-child(${nthSlide + 1})`);
  [...buttons.children].forEach((r) => r.classList.remove('selected'));
  button.classList.add('selected');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function filterItemsByLocation(items, locations) {
  if (!Array.isArray(locations)) locations = [locations];
  return items.filter(item =>
    Array.isArray(item.locationTag) &&
    item.locationTag.some(tag => {
      const parts = tag.split(':');
      const tagLocation = parts[1]?.trim().toLowerCase();
      return locations.some(loc => tagLocation === loc.toLowerCase());
    })
  );
}

function sortItemsByLastModified(items) {
  return items.sort((a, b) => {
    const getLastModified = (item) => {
      const metaArr = item._metadata?.calendarMetadata || [];
      const lastMod = metaArr.find(m => m.name === 'cq:lastModified');
      return lastMod ? Date.parse(lastMod.value) : 0;
    };
    return getLastModified(b) - getLastModified(a);
  });
}

async function loadContentFragments(cfQueryPath) {
  const cfFolder = await fetch(`/graphql/execute.json/srilanka-airlines/${cfQueryPath}`);
  const cfFolderData = await cfFolder.json();
  const cfItems = cfFolderData?.data?.slCfModelList.items;
  return cfItems;
}

async function userLocation() {
  await delay(200);
  return {
    location: ['Delhi', 'Bangalore', 'Chennai']
  };
}

export default function decorate(block) {
  const buttons = document.createElement('div');
  buttons.classList.add('cf-carousel-buttons');
  const cfFolderPath = block?.textContent?.trim() || '';
  if (!cfFolderPath) return;

  const slidesToShow = 3; // Configurable: set to 2, 3, 4, or 5
  const classes = ['image', 'text'];
  (async () => {
    try {
      const cfItems = await loadContentFragments(cfFolderPath);
      const {location} = await userLocation();
      const filteredItems = filterItemsByLocation(cfItems, location);
      const sortedItems = sortItemsByLastModified(filteredItems);

      block.replaceChildren();
      sortedItems.forEach((item, i) => {
        const row = document.createElement("div");
        row.classList.add('slide');
        row.style.width = `${100 / slidesToShow}%`;
        row.innerHTML = `
          <div class="cf-carousel-image"><picture><img src="${item.image._path}" loading="eager"></picture></div>
          <div class="cf-carousel-text">
            <h3>${item.title}</h3>
            <p>${item.description?.plaintext || item.description || ''}</p>
          </div>
        `;
        block.append(row);
      });

      // Navigation buttons (pages)
      const totalSlides = sortedItems.length;
      const totalPages = Math.ceil(totalSlides / slidesToShow);
      for (let page = 0; page < totalPages; page++) {
        const button = document.createElement('button');
        button.title = `Go to slides ${page * slidesToShow + 1} - ${Math.min((page + 1) * slidesToShow, totalSlides)}`;
        if (page === 0) button.classList.add('selected');
        button.addEventListener('click', () => {
          block.scrollTo({
            left: block.clientWidth * page,
            behavior: 'smooth'
          });
          [...buttons.children].forEach((r) => r.classList.remove('selected'));
          button.classList.add('selected');
        });
        buttons.append(button);
      }

      if (block.nextElementSibling) block.nextElementSibling.replaceWith(buttons);
      else block.parentElement.append(buttons);

      // Highlight correct button on scroll
      block.addEventListener('scroll', () => {
        const page = Math.round(block.scrollLeft / block.clientWidth);
        [...buttons.children].forEach((r, idx) => {
          if (idx === page) r.classList.add('selected');
          else r.classList.remove('selected');
        });
      }, { passive: true });
    } catch (error) {
      console.error('Error loading content fragments or user location:', error);
    }
  })();
}
