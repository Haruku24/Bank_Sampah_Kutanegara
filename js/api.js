(() => {
  'use strict';

  const API_URL =
    'https://script.google.com/macros/s/AKfycbzPOvrna5CgcLebUfKUEz59r_ys2sX-wjivSENtxNiDUBdEtY6EGtUFNouE5GVvQx_n/exec';

  const API_TIMEOUT_MS = 15000;


  async function apiGet(action, params = {}) {
    const query = new URLSearchParams({
      action,
      ...removeEmptyValues(params)
    });

    const response = await fetchWithTimeout(
      `${API_URL}?${query.toString()}`,
      {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      }
    );

    return parseApiResponse(response);
  }


  async function apiPost(action, payload = {}) {
    const response = await fetchWithTimeout(
      API_URL,
      {
        method: 'POST',
        redirect: 'follow',
        cache: 'no-store',

        headers: {
          'Content-Type':
            'text/plain;charset=UTF-8'
        },

        body: JSON.stringify({
          action,
          payload
        })
      }
    );

    return parseApiResponse(response);
  }


  async function fetchWithTimeout(
    url,
    options = {}
  ) {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(() => {
        controller.abort();
      }, API_TIMEOUT_MS);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } catch (error) {
      if (
        error &&
        error.name === 'AbortError'
      ) {
        throw new Error(
          'API tidak merespons dalam 15 detik.'
        );
      }

      throw error;
    } finally {
      window.clearTimeout(
        timeoutId
      );
    }
  }


  async function parseApiResponse(
    response
  ) {
    const text =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${text}`
      );
    }

    let result;

    try {
      result =
        JSON.parse(text);
    } catch (error) {
      console.error(
        'Respons server bukan JSON:',
        text
      );

      throw new Error(
        'Server tidak mengembalikan JSON yang valid.'
      );
    }

    if (!result.success) {
      throw new Error(
        result.message ||
        'Permintaan API gagal.'
      );
    }

    return result.data;
  }


  function removeEmptyValues(
    object
  ) {
    return Object.fromEntries(
      Object
        .entries(object)
        .filter(([, value]) => {
          return (
            value !== '' &&
            value !== null &&
            value !== undefined
          );
        })
    );
  }


  function getQueryParam(name) {
    return (
      new URLSearchParams(
        window.location.search
      ).get(name) || ''
    );
  }


  function formatRupiah(value) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }
    ).format(
      Number(value) || 0
    );
  }


  function formatNumber(
    value,
    digits = 2
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        maximumFractionDigits:
          digits
      }
    ).format(
      Number(value) || 0
    );
  }


  function formatDateTime(value) {
    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ).format(date);
  }


  function escapeHtml(value) {
    return String(value ?? '')
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }


  function showToast(
    message,
    type = 'success'
  ) {
    let container =
      document.getElementById(
        'toastContainer'
      );

    if (!container) {
      container =
        document.createElement(
          'div'
        );

      container.id =
        'toastContainer';

      container.className =
        'toast-container';

      document.body.appendChild(
        container
      );
    }

    const toast =
      document.createElement(
        'div'
      );

    toast.className =
      `toast ${type}`;

    toast.textContent =
      message;

    container.appendChild(
      toast
    );

    window.setTimeout(() => {
      toast.classList.add(
        'hide'
      );

      window.setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3200);
  }


  function setButtonLoading(
    button,
    loading,
    loadingText = 'Memproses...'
  ) {
    if (!button) {
      return;
    }

    if (loading) {
      button.dataset.originalText =
        button.textContent;

      button.disabled =
        true;

      button.textContent =
        loadingText;
    } else {
      button.disabled =
        false;

      button.textContent =
        button.dataset.originalText ||
        button.textContent;
    }
  }


  async function compressImage(
    file,
    maxWidth = 1280,
    quality = 0.78
  ) {
    if (!file) {
      return null;
    }

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      throw new Error(
        'File yang dipilih bukan gambar.'
      );
    }

    const image =
      await loadImageFile(file);

    const scale =
      Math.min(
        1,
        maxWidth / image.width
      );

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      Math.max(
        1,
        Math.round(
          image.width * scale
        )
      );

    canvas.height =
      Math.max(
        1,
        Math.round(
          image.height * scale
        )
      );

    const context =
      canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Canvas gambar tidak tersedia.'
      );
    }

    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const mimeType =
      file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg';

    const dataUrl =
      canvas.toDataURL(
        mimeType,
        quality
      );

    return {
      dataUrl,

      fileName:
        file.name.replace(
          /\.[^.]+$/,
          ''
        ) +
        (
          mimeType === 'image/png'
            ? '.png'
            : '.jpg'
        ),

      mimeType
    };
  }


  function loadImageFile(file) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          const image =
            new Image();

          image.onload = () => {
            resolve(image);
          };

          image.onerror = () => {
            reject(
              new Error(
                'Gambar gagal dibaca.'
              )
            );
          };

          image.src =
            reader.result;
        };

        reader.onerror = () => {
          reject(
            new Error(
              'File gagal dibaca.'
            )
          );
        };

        reader.readAsDataURL(
          file
        );
      }
    );
  }


  window.BankSampahAPI =
    Object.freeze({
      apiGet,
      apiPost,
      getQueryParam,
      formatRupiah,
      formatNumber,
      formatDateTime,
      escapeHtml,
      showToast,
      setButtonLoading,
      compressImage
    });
})();