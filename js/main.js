(() => {
  "use strict";

  const data = window.ALBUM_DATA;
  const fallbackImage = "images/photo-placeholder.svg";
  const $ = (selector, root = document) => root.querySelector(selector);
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const setImageFallback = (img) => {
    img.addEventListener("error", () => {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = "true";
      img.src = img.dataset.fallback || fallbackImage;
    });
  };

  document.querySelectorAll("img[data-fallback]").forEach(setImageFallback);

  const passwordScreen = $("#password-screen");
  const siteContent = $("#site-content");
  const pinSlots = $("#pin-slots");
  const pinInputs = Array.from(pinSlots.querySelectorAll(".pin-digit"));
  const sessionUnlockKey = "site-unlocked";
  if (sessionStorage.getItem(sessionUnlockKey) === "true") {
    passwordScreen.hidden = true;
    siteContent.hidden = false;
    document.body.classList.add("is-unlocked");
  }
  const unlockSite = () => {
    const enteredPin = pinInputs.map((input) => input.value).join("");
    if (enteredPin === data.password) {
      sessionStorage.setItem(sessionUnlockKey, "true");
      passwordScreen.classList.add("is-unlocked");
      window.setTimeout(() => {
        passwordScreen.hidden = true;
        siteContent.hidden = false;
        document.body.classList.add("is-unlocked");
        $("#home").focus({ preventScroll: true });
        revealObserver.observeElements();
      }, 480);
      return;
    }
    pinSlots.classList.remove("is-wrong");
    void pinSlots.offsetWidth;
    pinSlots.classList.add("is-wrong");
    window.setTimeout(() => {
      pinInputs.forEach((input) => { input.value = ""; });
      pinInputs[0].focus();
    }, 350);
  };
  $("#password-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (pinInputs.every((input) => input.value)) unlockSite();
  });
  pinInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      if (input.value && index < pinInputs.length - 1) pinInputs[index + 1].focus();
      if (pinInputs.every((digit) => digit.value)) $("#password-form").requestSubmit();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        pinInputs[index - 1].value = "";
        pinInputs[index - 1].focus();
      }
      if (event.key === "ArrowLeft" && index > 0) pinInputs[index - 1].focus();
      if (event.key === "ArrowRight" && index < pinInputs.length - 1) pinInputs[index + 1].focus();
    });
    input.addEventListener("paste", (event) => {
      const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, pinInputs.length);
      if (!pastedDigits) return;
      event.preventDefault();
      pinInputs.forEach((digitInput, digitIndex) => {
        digitInput.value = pastedDigits[digitIndex] || "";
      });
      const nextEmpty = pinInputs.find((digitInput) => !digitInput.value);
      if (nextEmpty) nextEmpty.focus();
      else $("#password-form").requestSubmit();
    });
  });
  $("#start-date").textContent = data.startDate;

  const footerPhotos = data.footerPhotos;
  const footerCarouselImage = $("#footer-carousel-image");
  const footerCarouselCount = $("#footer-carousel-count");
  footerCarouselImage.dataset.fallback = fallbackImage;
  setImageFallback(footerCarouselImage);
  let activeFooterPhotoIndex = 0;
  const updateFooterPhoto = () => {
    const item = footerPhotos[activeFooterPhotoIndex];
    footerCarouselImage.src = item.image;
    footerCarouselImage.alt = item.alt;
    footerCarouselCount.textContent = `${activeFooterPhotoIndex + 1} / ${footerPhotos.length}`;
  };
  $("[data-footer-prev]").addEventListener("click", () => {
    activeFooterPhotoIndex = (activeFooterPhotoIndex - 1 + footerPhotos.length) % footerPhotos.length;
    updateFooterPhoto();
  });
  $("[data-footer-next]").addEventListener("click", () => {
    activeFooterPhotoIndex = (activeFooterPhotoIndex + 1) % footerPhotos.length;
    updateFooterPhoto();
  });
  updateFooterPhoto();

  const revealObserver = {
    observer: null,
    observeElements() {
      if (!("IntersectionObserver" in window)) {
        document.querySelectorAll(".reveal, .gallery-item").forEach((item) => item.classList.add("is-visible"));
        return;
      }
      if (!this.observer) {
        this.observer = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });
      }
      document.querySelectorAll(".reveal:not(.is-visible), .gallery-item:not(.is-visible)").forEach((item) => this.observer.observe(item));
    }
  };

  const cardGrid = $("#memory-grid");
  const cardFrameUpdates = [];
  data.cards.forEach((item, index) => {
    const article = create("article", `flip-card flip-card-${index + 1}`);
    article.dataset.flipped = "false";
    const inner = create("div", "flip-card-inner");
    const front = create("div", "flip-face flip-front");
    const number = create("span", "card-number", `0${index + 1}`);
    const question = create("h3", "", item.prompt);
    const button = create("button", "text-button", "Перевернуть");
    button.type = "button";
    button.tabIndex = 0;
    button.setAttribute("aria-label", `Узнать: ${item.prompt}`);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const flipped = article.dataset.flipped !== "true";
      article.dataset.flipped = String(flipped);
      button.tabIndex = flipped ? -1 : 0;
      backButton.tabIndex = flipped ? 0 : -1;
      button.setAttribute("aria-pressed", String(flipped));
      button.setAttribute("aria-label", `${flipped ? "Вернуться к вопросу" : "Узнать"}: ${item.prompt}`);
    });
    front.append(number, question, button);
    const back = create("div", "flip-face flip-back");
    const img = create("img");
    img.src = item.image;
    img.alt = item.alt || item.prompt;
    img.loading = "lazy";
    img.dataset.fallback = fallbackImage;
    setImageFallback(img);
    const updateCardFrame = () => {
      if (!img.naturalWidth || !article.clientWidth) return;
      const width = article.clientWidth;
      const side = width * 0.045;
      const top = width * 0.045;
      const bottom = width * 0.16;
      const imageHeight = (width - side * 2) * img.naturalHeight / img.naturalWidth;
      article.style.aspectRatio = `${width} / ${top + imageHeight + bottom}`;
      article.style.setProperty("--card-frame-side", `${side}px`);
      article.style.setProperty("--card-frame-top", `${top}px`);
      article.style.setProperty("--card-frame-bottom", `${bottom}px`);
    };
    cardFrameUpdates.push(updateCardFrame);
    img.addEventListener("load", updateCardFrame);
    const backButton = create("button", "text-button back-button", "Перевернуть обратно");
    backButton.type = "button";
    backButton.tabIndex = -1;
    backButton.addEventListener("click", () => {
      article.dataset.flipped = "false";
      button.tabIndex = 0;
      backButton.tabIndex = -1;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `Узнать: ${item.prompt}`);
    });
    back.append(img);
    if (item.caption) back.append(create("p", "card-caption", item.caption));
    if (item.note) back.append(create("span", "handwritten card-note", item.note));
    back.append(backButton);
    inner.append(front, back);
    article.append(inner);
    cardGrid.append(article);
  });
  window.addEventListener("resize", () => cardFrameUpdates.forEach((update) => update()), { passive: true });

  const photoModal = $("#photo-modal");
  const modalImage = $("#modal-image");
  const modalCaption = $("#modal-caption");
  const modalDate = $("#modal-date");
  const videoModal = $("#video-modal");
  const videoContent = $("#video-modal-content");
  const openVideo = (item) => {
    videoContent.replaceChildren();
    const title = create("h2", "", item.title || item.caption);
    if (item.gif) {
      const gif = create("img", "modal-gif");
      gif.src = item.gif;
      gif.alt = item.alt || item.caption;
      gif.dataset.fallback = item.poster || fallbackImage;
      setImageFallback(gif);
      videoContent.append(title, gif, create("p", "video-caption", item.caption));
    } else if (item.video || item.webm) {
      const video = create("video");
      video.controls = true;
      video.preload = "none";
      video.playsInline = true;
      video.poster = item.poster || fallbackImage;
      if (item.video) {
        const source = create("source");
        source.src = item.video;
        source.type = "video/mp4";
        video.append(source);
      }
      if (item.webm) {
        const source = create("source");
        source.src = item.webm;
        source.type = "video/webm";
        video.append(source);
      }
      video.addEventListener("error", () => {
        const still = create("img");
        still.src = item.poster || fallbackImage;
        still.alt = item.alt || `${title.textContent}: ${item.caption}`;
        still.dataset.fallback = fallbackImage;
        setImageFallback(still);
        video.replaceWith(still, create("p", "media-note", "Добавьте видео по указанному пути в js/data.js."));
      });
      videoContent.append(title, video, create("p", "video-caption", item.caption));
    } else {
      const still = create("img");
      still.src = item.poster || fallbackImage;
      still.alt = item.alt || `${title.textContent}: ${item.caption}`;
      still.dataset.fallback = fallbackImage;
      setImageFallback(still);
      videoContent.append(title, still, create("p", "video-caption", item.caption), create("p", "media-note", "Добавьте путь к видео в js/data.js, чтобы включить воспроизведение."));
    }
    videoModal.showModal();
  };
  let activePhotoIndex = 0;
  const galleryPhotos = data.gallery.filter((item) => !item.video && !item.webm);
  const photoModalUpdate = () => {
    const item = galleryPhotos[activePhotoIndex];
    modalImage.src = item.image;
    modalImage.alt = item.alt;
    modalImage.dataset.fallback = fallbackImage;
    setImageFallback(modalImage);
    modalCaption.textContent = item.caption;
    modalDate.textContent = item.date;
  };
  const openPhoto = (index) => {
    activePhotoIndex = index;
    photoModalUpdate();
    photoModal.showModal();
  };
  data.gallery.forEach((item, index) => {
    const isGif = typeof item.image === "string" && /\.gif(?:$|\?)/i.test(item.image);
    const figure = create("figure", `gallery-item polaroid gallery-position-${index + 1} ${item.shape}${isGif ? " gallery-gif" : ""}`);
    const hasVideo = Boolean(item.video || item.webm);
    const button = create("button", `gallery-photo${hasVideo ? " gallery-video-trigger" : ""}`);
    button.type = "button";
    button.setAttribute("aria-label", `${hasVideo ? "Открыть видео" : "Открыть фото"}: ${item.alt}`);
    const img = create("img");
    img.src = hasVideo ? (item.poster || fallbackImage) : item.image;
    img.alt = item.alt;
    img.loading = "lazy";
    img.dataset.fallback = fallbackImage;
    setImageFallback(img);
    button.append(img);
    if (hasVideo) {
      button.append(create("span", "play-mark", "▶"));
      button.addEventListener("click", () => openVideo(item));
    } else {
      button.addEventListener("click", () => openPhoto(galleryPhotos.indexOf(item)));
    }
    const caption = create("figcaption", "gallery-caption");
    caption.append(create("span", "handwritten", item.caption), create("time", "", item.date));
    figure.append(button, caption);
    $("#gallery-grid").append(figure);
  });
  $("[data-close-photo]").addEventListener("click", () => photoModal.close());
  $(".modal-prev").addEventListener("click", () => {
    activePhotoIndex = (activePhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    photoModalUpdate();
  });
  $(".modal-next").addEventListener("click", () => {
    activePhotoIndex = (activePhotoIndex + 1) % galleryPhotos.length;
    photoModalUpdate();
  });
  photoModal.addEventListener("click", (event) => {
    if (event.target === photoModal) photoModal.close();
  });
  photoModal.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") $(".modal-prev").click();
    if (event.key === "ArrowRight") $(".modal-next").click();
  });

  const memoryModal = $("#memory-modal");
  const memoryContent = $("#memory-modal-content");
  data.secretDates.forEach((item, index) => {
    const target = $(`[data-dates="${item.placement}"]`);
    if (!target) return;
    const button = create("button", `secret-date secret-date-${index + 1}`, item.date);
    button.type = "button";
    button.setAttribute("aria-label", `Открыть воспоминание: ${item.title}, ${item.date}`);
    button.addEventListener("click", () => {
      memoryContent.replaceChildren();
      const image = create("img");
      image.src = item.image;
      image.alt = item.alt;
      image.loading = "lazy";
      image.dataset.fallback = fallbackImage;
      setImageFallback(image);
      memoryContent.append(image, create("p", "eyebrow", item.date), create("h2", "", item.title), create("p", "memory-story", item.story));
      memoryModal.showModal();
    });
    target.append(button);
  });
  $("[data-close-memory]").addEventListener("click", () => memoryModal.close());
  memoryModal.addEventListener("click", (event) => {
    if (event.target === memoryModal) memoryModal.close();
  });

  $("[data-close-video]").addEventListener("click", () => videoModal.close());
  videoModal.addEventListener("close", () => {
    const video = $("video", videoContent);
    if (video) video.pause();
  });
  videoModal.addEventListener("click", (event) => {
    if (event.target === videoModal) videoModal.close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openDialog = [videoModal, memoryModal, photoModal].find((dialog) => dialog.open);
    if (openDialog) openDialog.close();
  });

  const spotifyArea = $("#spotify-area");
  const spotifyUrlIsValid = (value) => {
    try { return new URL(value).hostname === "open.spotify.com"; } catch { return false; }
  };
  if (spotifyUrlIsValid(data.spotifyUrl)) {
    const link = create("a", "button button-dark", "Открыть наш плейлист ↗");
    link.href = data.spotifyUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    spotifyArea.append(link);
  } else {
    spotifyArea.append(create("p", "spotify-placeholder", "тут должна была быть ссылка на плейлист, но дать ссылку можешь только ты ("));
  }
  if (spotifyUrlIsValid(data.spotifyEmbedUrl) && /\/embed\//.test(data.spotifyEmbedUrl)) {
    const iframe = create("iframe", "spotify-embed");
    iframe.src = data.spotifyEmbedUrl;
    iframe.title = "Spotify playlist";
    iframe.loading = "lazy";
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "");
    spotifyArea.append(iframe);
  }

  const letterBody = $("#letter-body");
  data.letter.forEach((paragraph) => letterBody.append(create("p", "", paragraph)));
  const envelopeWrap = $("#envelope-wrap");
  const letterPaper = $("#letter-paper");
  $("#open-letter").addEventListener("click", () => {
    envelopeWrap.classList.add("is-open");
    window.setTimeout(() => {
      letterPaper.hidden = false;
      letterPaper.scrollIntoView({ behavior: "smooth", block: "center" });
      $("#close-letter").focus({ preventScroll: true });
    }, 420);
  });
  $("#close-letter").addEventListener("click", () => {
    letterPaper.hidden = true;
    envelopeWrap.classList.remove("is-open");
    $("#open-letter").focus({ preventScroll: true });
  });

  revealObserver.observeElements();
})();
