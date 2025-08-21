from __future__ import annotations

from typing import List, Optional, Dict, Any

from ..db.mongo import ensure_connection
from ..models.educational import EducationalContent
from bson import ObjectId


class EducationalService:
    """Service for CRUD operations on educational content."""

    def __init__(self):
        pass

    async def create(self, data: dict) -> EducationalContent:
        payload = EducationalContent(**data)
        db = await ensure_connection()
        collection = db.educational_contents
        result = await collection.insert_one(payload.model_dump(by_alias=True, exclude={"id"}))
        payload.id = str(result.inserted_id)
        return payload

    async def list(self, limit: int = 50, skip: int = 0, filters: Optional[Dict[str, Any]] = None) -> list[EducationalContent]:
        db = await ensure_connection()
        collection = db.educational_contents
        query: Dict[str, Any] = filters or {}
        cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items: List[EducationalContent] = []
        async for doc in cursor:
            items.append(EducationalContent.model_validate(self._normalize_doc(doc)))
        return items

    async def get(self, content_id: str | ObjectId) -> Optional[EducationalContent]:
        if isinstance(content_id, str):
            content_id = ObjectId(content_id)
        db = await ensure_connection()
        collection = db.educational_contents
        doc = await collection.find_one({"_id": content_id})
        if doc:
            return EducationalContent.model_validate(self._normalize_doc(doc))
        return None

    async def get_by_slug(self, slug: str) -> Optional[EducationalContent]:
        db = await ensure_connection()
        collection = db.educational_contents
        doc = await collection.find_one({"slug": slug})
        if doc:
            return EducationalContent.model_validate(self._normalize_doc(doc))
        return None

    async def update(self, content_id: str | ObjectId, data: dict) -> Optional[EducationalContent]:
        if isinstance(content_id, str):
            content_id = ObjectId(content_id)
        db = await ensure_connection()
        collection = db.educational_contents
        await collection.update_one({"_id": content_id}, {"$set": data})
        return await self.get(content_id)

    async def delete(self, content_id: str | ObjectId) -> bool:
        if isinstance(content_id, str):
            content_id = ObjectId(content_id)
        db = await ensure_connection()
        collection = db.educational_contents
        result = await collection.delete_one({"_id": content_id})
        return result.deleted_count == 1

    async def seed_initial_education_contents(self) -> None:
        """Seed a minimal set of Infoin contents if they are missing."""
        db = await ensure_connection()
        collection = db.educational_contents

        initial_items: List[dict] = [
            {
                "title": "Cara Menyetorkan Sampah di SmartBin Setorin",
                "description": "Panduan langkah demi langkah untuk menyetorkan sampah ke SmartBin Setorin.",
                "content": (
                    "Ikuti panduan ini untuk menyetorkan sampah dengan benar:\n\n"
                    "1. Buka aplikasi dan pilih menu Scan.\n"
                    "2. Arahkan kamera ke material sampah.\n"
                    "3. Ikuti instruksi di layar hingga proses selesai.\n\n"
                    "Tips: Pastikan sampah bersih dan kering untuk hasil terbaik."
                ),
                "slug": "cara-menyetorkan-sampah-di-smartbin-setorin",
                "category": "tutorial",
                "estimated_read_time": 5,
                "tags": ["tutorial", "setor", "smartbin"],
                "is_published": True,
                "content_type": "tutorial",
                "media_url": None,
            },
            {
                "title": "Cara Mencairkan Saldo Setoran",
                "description": "Pelajari cara menarik saldo hasil setoran Anda dengan aman.",
                "content": (
                    "Untuk mencairkan saldo:\n\n"
                    "1. Buka menu Payout.\n"
                    "2. Pilih metode penarikan yang tersedia.\n"
                    "3. Masukkan nominal dan konfirmasi.\n\n"
                    "Dana akan diproses sesuai SLA bank/ewallet Anda."
                ),
                "slug": "cara-mencairkan-saldo-setoran",
                "category": "tutorial",
                "estimated_read_time": 5,
                "tags": ["tutorial", "saldo", "pencairan"],
                "is_published": True,
                "content_type": "tutorial",
                "media_url": None,
            },
            {
                "title": "Cara Mensortir Sampah di Rumah",
                "description": "Langkah sederhana menyortir sampah organik dan anorganik di rumah.",
                "content": (
                    "Mulailah dari hal kecil:\n\n"
                    "• Pisahkan plastik, kertas, kaca, dan logam.\n"
                    "• Bilas kemasan makanan/minuman.\n"
                    "• Gunakan wadah terpisah dan beri label."
                ),
                "slug": "cara-mensortir-sampah-di-rumah",
                "category": "tutorial",
                "estimated_read_time": 5,
                "tags": ["tutorial", "pilah", "rumah"],
                "is_published": True,
                "content_type": "tutorial",
                "media_url": None,
            },
            {
                "title": "Peluang Bisnis B2B di Sektor Pengelolaan Sampah",
                "description": "Analisis singkat peluang kemitraan dan model bisnis pengelolaan sampah B2B.",
                "content": (
                    "Permintaan akan layanan pengelolaan sampah profesional terus meningkat.\n\n"
                    "Model bisnis meliputi kemitraan pickup terjadwal, pengolahan material bernilai, \n"
                    "hingga layanan data dan pelaporan kepatuhan."
                ),
                "slug": "peluang-bisnis-b2b-di-sektor-pengelolaan-sampah",
                "category": "article",
                "estimated_read_time": 10,
                "tags": ["artikel", "b2b", "bisnis"],
                "is_published": True,
                "content_type": "article",
                "media_url": None,
            },
            {
                "title": "Jenis-Jenis Sampah Plastik",
                "description": "Kenali kode plastik (PET, HDPE, dsb.) untuk memilah dengan benar.",
                "content": (
                    "Plastik memiliki beberapa kategori utama: PET, HDPE, PVC, LDPE, PP, PS, dan lainnya.\n\n"
                    "Masing-masing memiliki properti dan penanganan daur ulang berbeda."
                ),
                "slug": "jenis-jenis-sampah-plastik",
                "category": "article",
                "estimated_read_time": 8,
                "tags": ["artikel", "plastik"],
                "is_published": True,
                "content_type": "article",
                "media_url": None,
            },
            {
                "title": "Tips Membuat Rumah Hijau",
                "description": "Ide sederhana untuk mengurangi jejak karbon dari rumah Anda.",
                "content": (
                    "Mulai dari penghematan energi, kompos organik, hingga penggunaan ulang wadah.\n\n"
                    "Fokus pada kebiasaan kecil yang konsisten setiap hari."
                ),
                "slug": "tips-membuat-rumah-hijau",
                "category": "article",
                "estimated_read_time": 5,
                "tags": ["artikel", "gaya-hidup"],
                "is_published": True,
                "content_type": "article",
                "media_url": None,
            },
        ]

        for item in initial_items:
            exists = await collection.find_one({"slug": item["slug"]})
            if not exists:
                await collection.insert_one(item)

    # Internal helpers
    def _slugify(self, text: str) -> str:
        safe = ''.join(ch.lower() if ch.isalnum() else '-' for ch in text)
        while '--' in safe:
            safe = safe.replace('--', '-')
        return safe.strip('-')

    def _normalize_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Fill defaults for legacy documents so pydantic validation does not fail."""
        if not doc:
            return doc
        normalized = dict(doc)
        title = normalized.get('title') or 'Untitled'
        normalized.setdefault('description', normalized.get('description') or '')
        normalized.setdefault('content', normalized.get('content') or normalized.get('description') or '')
        normalized.setdefault('slug', normalized.get('slug') or self._slugify(title))
        # Derive category from existing content_type if missing
        content_type = normalized.get('content_type') or 'article'
        category_guess = 'tutorial' if content_type in ['tutorial', 'tip', 'guide'] else 'article'
        normalized.setdefault('category', normalized.get('category') or category_guess)
        normalized.setdefault('estimated_read_time', normalized.get('estimated_read_time') or 5)
        normalized.setdefault('tags', normalized.get('tags') or [])
        normalized.setdefault('is_published', normalized.get('is_published') if 'is_published' in normalized else True)
        normalized.setdefault('content_type', content_type)
        return normalized
