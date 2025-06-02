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

export function updateButtons(activeSlide) {
  const block = activeSlide.closest('.block');
  const buttons = block.closest('.cf-carousel-wrapper').querySelector('.cf-carousel-buttons');

  const nthSlide = activeSlide.offsetLeft / activeSlide.parentNode.clientWidth;
  const button = block.parentElement.querySelector(`.cf-carousel-buttons > button:nth-child(${nthSlide + 1})`);
  [...buttons.children].forEach((r) => r.classList.remove('selected'));
  button.classList.add('selected');
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
  const cfFolderPath = block?.textContent?.trim() || '';
  if (!cfFolderPath) return;

  const classes = ['image', 'text'];
  (async () => {
    try {
      const cfItems = await loadContentFragments(cfFolderPath);
      const {location} = await userLocation();
      const filteredItems = filterItemsByLocation(cfItems, location);
      const sortedItems = sortItemsByLastModified(filteredItems);
      console.log('Filtered & Sorted Items:', sortedItems);
      
      block.replaceChildren();
      sortedItems.forEach((item, i) => {
        const row = document.createElement("div");
        row.classList.add('slide');
        row.innerHTML = `
        <div class="carousel-image"><picture><img src="/content/dam/srilanka-airlines/assets/carousel/ci-1.jpg" data-aue-prop="image" data-aue-label="Image" data-aue-type="media" loading="eager"></picture></div>
        <div class="carousel-text">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </div>`;
        block.append(row);

        /* buttons */
        const button = document.createElement('button');
        button.title = 'Carousel Nav';
        if (!i) button.classList.add('selected');
        button.addEventListener('click', () => {
          block.scrollTo({ top: 0, left: row.offsetLeft - row.parentNode.offsetLeft, behavior: 'smooth' });
          [...buttons.children].forEach((r) => r.classList.remove('selected'));
          button.classList.add('selected');
        });
        buttons.append(button);
      });

      if (block.nextElementSibling) block.nextElementSibling.replaceWith(buttons);
      else block.parentElement.append(buttons);

      block.addEventListener('scrollend', () => {
        const activeElement = Math.round(block.scrollLeft / block.children[0].clientWidth);
        const slide = block.children[activeElement];
        updateButtons(slide);
      }, { passive: true });
    } catch (error) {
      console.error('Error loading content fragments or user location:', error);
    }
  })();
}
