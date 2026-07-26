from sqlalchemy.orm import Session

from app.utils.slug import slugify


def unique_slug(db: Session, model, base_slug: str, exclude_id=None) -> str:
    slug = slugify(base_slug)
    candidate = slug
    counter = 2

    while True:
        query = db.query(model).filter(model.slug == candidate)
        if exclude_id is not None:
            query = query.filter(model.id != exclude_id)
        if query.first() is None:
            return candidate
        candidate = f"{slug}-{counter}"
        counter += 1
