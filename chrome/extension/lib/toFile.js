const toBlob = base64String => {
  return window.fetch(base64String).then(res => res.blob());
};

export const toFile = async (base64String, type) => {
  const blob = await toBlob(base64String);

  Object.defineProperty(blob, "name", {
    get: function() {
      return "photo.png";
    }
  });

  Object.defineProperty(blob, "type", {
    get: function() {
      return type;
    }
  });

  return blob;
};
