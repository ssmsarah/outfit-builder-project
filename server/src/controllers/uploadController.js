export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  res.status(201).json({ imageUrl });
};
