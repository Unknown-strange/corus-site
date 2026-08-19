"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Upload,
  X,
  Images,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  useSearchParams,
  useRouter,
} from "next/navigation";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type GalleryItem = {
  id: string;
  image_url: string;
  imagekit_file_id: string;
  title: string;
  body: string;
  caption: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type SelectedImage = {
  id: string;
  file: File;
  preview: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ManageGalleryPage() {
  const router = useRouter();
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [gallery, setGallery] =
    useState<GalleryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [showUpload, setShowUpload] =
    useState(false);

  const [selectedImages, setSelectedImages] =
    useState<SelectedImage[]>([]);

  const [caption, setCaption] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const goBack = () => {
    router.push("/admin/Manage");
  };
  /* =========================================================
     LOAD GALLERY
  ========================================================= */

  const fetchGallery = async () => {
    try {
      setLoading(true);
      setError(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `${API_BASE}/admin/site-content?section=gallery`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem("user");

        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to load gallery."
        );
      }

      const data =
        await response.json();

      const sorted = [...data].sort(
        (
          a: GalleryItem,
          b: GalleryItem
        ) =>
          a.sort_order -
          b.sort_order
      );

      setGallery(sorted);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load the gallery."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  /* =========================================================
     SELECT IMAGES
  ========================================================= */

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    setError(null);
    setSuccess(null);

    if (files.length > MAX_FILES) {
      setError(
        `You can upload a maximum of ${MAX_FILES} images at once.`
      );

      event.target.value = "";
      return;
    }

    const invalidType =
      files.find(
        (file) =>
          !ACCEPTED_TYPES.includes(
            file.type
          )
      );

    if (invalidType) {
      setError(
        `"${invalidType.name}" is not supported. Please use JPG, PNG, or WebP.`
      );

      event.target.value = "";
      return;
    }

    const oversized =
      files.find(
        (file) =>
          file.size > MAX_FILE_SIZE
      );

    if (oversized) {
      setError(
        `"${oversized.name}" is larger than 20MB.`
      );

      event.target.value = "";
      return;
    }

    selectedImages.forEach(
      (image) => {
        URL.revokeObjectURL(
          image.preview
        );
      }
    );

    const selected: SelectedImage[] =
      files.map((file) => ({
        id:
          `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview:
          URL.createObjectURL(file),
      }));

    setSelectedImages(selected);
  };

  /* =========================================================
     REMOVE SELECTED IMAGE
  ========================================================= */

  const removeSelectedImage = (
    id: string
  ) => {
    setSelectedImages(
      (current) => {
        const image =
          current.find(
            (item) =>
              item.id === id
          );

        if (image) {
          URL.revokeObjectURL(
            image.preview
          );
        }

        return current.filter(
          (item) =>
            item.id !== id
        );
      }
    );
  };

  /* =========================================================
     OPEN/CLOSE UPLOAD
  ========================================================= */

  const openUpload = () => {
    setShowUpload(true);
    setError(null);
    setSuccess(null);
  };

  const closeUpload = () => {
    if (uploading) return;

    selectedImages.forEach(
      (image) => {
        URL.revokeObjectURL(
          image.preview
        );
      }
    );

    setShowUpload(false);
    setSelectedImages([]);
    setCaption("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =========================================================
     UPLOAD ONE IMAGE
  ========================================================= */

  const uploadSingleImage = async (
    image: SelectedImage,
    token: string,
    sortOrder: number
  ) => {
    const uploadData =
      new FormData();

    uploadData.append(
      "file",
      image.file
    );

    uploadData.append(
      "purpose",
      "gallery"
    );

    const uploadResponse =
      await fetch(
        `${API_BASE}/admin/uploads`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          body: uploadData,
        }
      );

    if (
      uploadResponse.status === 401
    ) {
      throw new Error(
        "Your session has expired."
      );
    }

    if (!uploadResponse.ok) {
      const responseText =
        await uploadResponse.text();

      let errorMessage =
        `Failed to upload ${image.file.name}.`;

      try {
        const errorData =
          JSON.parse(responseText);

        if (
          Array.isArray(
            errorData?.detail
          )
        ) {
          errorMessage =
            errorData.detail
              .map(
                (item: any) =>
                  item.msg ||
                  JSON.stringify(item)
              )
              .join(", ");
        } else if (
          errorData?.detail
        ) {
          errorMessage =
            String(
              errorData.detail
            );
        } else if (
          errorData?.message
        ) {
          errorMessage =
            String(
              errorData.message
            );
        }
      } catch {
        if (responseText.trim()) {
          errorMessage =
            `${errorMessage} ${responseText}`;
        }
      }

      throw new Error(
        errorMessage
      );
    }

    const uploaded =
      await uploadResponse.json();

    if (!uploaded?.url) {
      throw new Error(
        `No image URL was returned for ${image.file.name}.`
      );
    }

    const contentResponse =
      await fetch(
        `${API_BASE}/admin/site-content`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            section: "gallery",
            title:
              image.file.name,
            body: "",
            image_url:
              uploaded.url,
            imagekit_file_id:
              uploaded.file_id,
            caption:
              caption.trim(),
            sort_order:
              sortOrder,
            is_published: true,
          }),
        }
      );

    if (
      contentResponse.status === 401
    ) {
      throw new Error(
        "Your session has expired."
      );
    }

    if (!contentResponse.ok) {
      const errorData =
        await contentResponse
          .json()
          .catch(() => null);

      throw new Error(
        errorData?.detail ||
          `Failed to save ${image.file.name}.`
      );
    }
  };

  /* =========================================================
     UPLOAD ALL
  ========================================================= */

  const handleUpload = async () => {
    if (
      selectedImages.length === 0
    ) {
      setError(
        "Please select at least one image."
      );
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href = "/login";
        return;
      }

      let nextSortOrder =
        gallery.length > 0
          ? Math.max(
              ...gallery.map(
                (item) =>
                  item.sort_order
              )
            ) + 1
          : 0;

      const failedUploads: string[] =
        [];

      for (
        const image of selectedImages
      ) {
        try {
          await uploadSingleImage(
            image,
            token,
            nextSortOrder
          );

          nextSortOrder++;
        } catch (error) {
          console.error(
            `Upload failed for ${image.file.name}`,
            error
          );

          failedUploads.push(
            image.file.name
          );
        }
      }

      await fetchGallery();

      selectedImages.forEach(
        (image) => {
          URL.revokeObjectURL(
            image.preview
          );
        }
      );

      setSelectedImages([]);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      if (
        failedUploads.length === 0
      ) {
        setSuccess(
          `${selectedImages.length} ${
            selectedImages.length === 1
              ? "picture"
              : "pictures"
          } added successfully.`
        );

        setShowUpload(false);
        setCaption("");
      } else {
        setError(
          `${failedUploads.length} ${
            failedUploads.length === 1
              ? "image"
              : "images"
          } failed to upload.`
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload pictures."
      );
    } finally {
      setUploading(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteImage = async (
    id: string
  ) => {
    const confirmed =
      window.confirm(
        "Remove this picture from the gallery?"
      );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError(null);
      setSuccess(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/admin/site-content/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (
        response.status === 401
      ) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "user"
        );

        window.location.href = "/login";

        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to remove picture."
        );
      }

      setGallery(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );

      setSuccess(
        "Picture removed from the gallery."
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove picture."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const publishedCount =
    gallery.filter(
      (item) =>
        item.is_published
    ).length;

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section
            className={styles.hero}
          >
            <div
              className={
                styles.heroContent
              }
            >
                        <button
            type="button"
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>
              <span
                className={
                  styles.eyebrow
                }
              >
                Website Content
              </span>

              <h1
                className={
                  styles.heading
                }
              >
                Manage your gallery
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Choose which pictures
                appear on the Corus
                Studio homepage.
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <div
                className={
                  styles.statBox
                }
              >
                <div
                  className={
                    styles.statIcon
                  }
                >
                  <Images
                    size={21}
                  />
                </div>

                <div>
                  <strong>
                    {gallery.length}
                  </strong>

                  <span>
                    Total pictures
                  </span>
                </div>
              </div>

              <button
                className={
                  styles.heroButton
                }
                onClick={
                  openUpload
                }
              >
                <Plus size={19} />
                Add Pictures
              </button>
            </div>
          </section>

          {/* =================================================
              NOTICES
          ================================================= */}

          {error && (
            <div
              className={
                styles.noticeError
              }
            >
              <span>{error}</span>

              <button
                onClick={() =>
                  setError(null)
                }
              >
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div
              className={
                styles.noticeSuccess
              }
            >
              <span>{success}</span>

              <button
                onClick={() =>
                  setSuccess(null)
                }
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* =================================================
              GALLERY CARD
          ================================================= */}

          <section
            className={
              styles.galleryCard
            }
          >
            <div
              className={
                styles.galleryHeader
              }
            >
              <div>
                <div
                  className={
                    styles.galleryTitleRow
                  }
                >
                  <h2>
                    Homepage Gallery
                  </h2>

                  <span
                    className={
                      styles.publishedBadge
                    }
                  >
                    <CheckCircle2
                      size={14}
                    />
                    {publishedCount}{" "}
                    Published
                  </span>
                </div>

                <p>
                  These are the images
                  currently available
                  to visitors.
                </p>
              </div>

              <span
                className={
                  styles.galleryCount
                }
              >
                {gallery.length}{" "}
                {gallery.length === 1
                  ? "image"
                  : "images"}
              </span>
            </div>

            {/* =================================================
                GALLERY
            ================================================= */}

            {loading ? (
              <div
                className={
                  styles.loadingGrid
                }
              >
                {Array.from({
                  length: 10,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className={
                        styles.skeleton
                      }
                    />
                  )
                )}
              </div>
            ) : gallery.length === 0 ? (
              <div
                className={
                  styles.empty
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <Images
                    size={28}
                  />
                </div>

                <h3>
                  No pictures yet
                </h3>

                <p>
                  Add images to start
                  building your homepage
                  gallery.
                </p>

                <button
                  className={
                    styles.emptyButton
                  }
                  onClick={
                    openUpload
                  }
                >
                  <Plus size={18} />
                  Add Picture
                </button>
              </div>
            ) : (
              <div
                className={
                  styles.galleryGrid
                }
              >
                {gallery.map(
                  (item) => (
                    <article
                      key={item.id}
                      className={
                        styles.galleryItem
                      }
                    >
                      <div
                        className={
                          styles.imageContainer
                        }
                      >
                        <Image
                          src={
                            item.image_url
                          }
                          alt={
                            item.caption ||
                            item.title ||
                            "Gallery image"
                          }
                          fill
                          sizes="(max-width: 700px) 50vw, (max-width: 1100px) 25vw, 20vw"
                          className={
                            styles.galleryImage
                          }
                        />

                        <div
                          className={
                            styles.imageShade
                          }
                        />

                        <button
                          className={
                            styles.deleteButton
                          }
                          onClick={() =>
                            deleteImage(
                              item.id
                            )
                          }
                          disabled={
                            deletingId ===
                            item.id
                          }
                          aria-label="Remove picture"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>

                        <div
                          className={
                            styles.imageStatus
                          }
                        >
                          <CheckCircle2
                            size={13}
                          />
                          Published
                        </div>
                      </div>

                      {item.caption && (
                        <p
                          className={
                            styles.caption
                          }
                        >
                          {item.caption}
                        </p>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* =====================================================
          UPLOAD MODAL
      ===================================================== */}

      {showUpload && (
        <div
          className={
            styles.modalBackdrop
          }
          onClick={
            closeUpload
          }
        >
          <div
            className={
              styles.modal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.modalEyebrow
                  }
                >
                  Homepage Gallery
                </span>

                <h2>
                  Add pictures
                </h2>

                <p>
                  Select up to 10 images.
                </p>
              </div>

              <button
                className={
                  styles.closeButton
                }
                onClick={
                  closeUpload
                }
                disabled={
                  uploading
                }
              >
                <X size={21} />
              </button>
            </div>

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={
                handleFileChange
              }
              className={
                styles.fileInput
              }
            />

            {selectedImages.length ===
            0 ? (
              <button
                type="button"
                className={
                  styles.uploadArea
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <div
                  className={
                    styles.uploadIcon
                  }
                >
                  <Upload
                    size={25}
                  />
                </div>

                <strong>
                  Select your images
                </strong>

                <span>
                  JPG, PNG or WebP
                  <br />
                  Up to 10 images ·
                  20MB each
                </span>
              </button>
            ) : (
              <div
                className={
                  styles.selectedGrid
                }
              >
                {selectedImages.map(
                  (image) => (
                    <div
                      key={image.id}
                      className={
                        styles.selectedItem
                      }
                    >
                      <Image
                        src={
                          image.preview
                        }
                        alt={
                          image.file.name
                        }
                        width={260}
                        height={260}
                        className={
                          styles.selectedImage
                        }
                      />

                      <button
                        type="button"
                        className={
                          styles.removeSelected
                        }
                        onClick={() =>
                          removeSelectedImage(
                            image.id
                          )
                        }
                        disabled={
                          uploading
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                )}

                {selectedImages.length <
                  MAX_FILES && (
                  <button
                    type="button"
                    className={
                      styles.addMore
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      uploading
                    }
                  >
                    <Plus
                      size={24}
                    />

                    <span>
                      Add more
                    </span>
                  </button>
                )}
              </div>
            )}

            <input
              type="text"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(event) =>
                setCaption(
                  event.target.value
                )
              }
              className={
                styles.captionInput
              }
              disabled={
                uploading
              }
            />

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                onClick={
                  closeUpload
                }
                disabled={
                  uploading
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.uploadButton
                }
                onClick={
                  handleUpload
                }
                disabled={
                  uploading ||
                  selectedImages.length ===
                    0
                }
              >
                {uploading
                  ? "Uploading..."
                  : `Upload ${
                      selectedImages.length
                    } ${
                      selectedImages.length ===
                      1
                        ? "picture"
                        : "pictures"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}