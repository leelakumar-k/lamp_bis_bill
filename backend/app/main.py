from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import customers, licenses, sales, sync

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Independent FastAPI microservice for Restaurant POS: Super, Gold, and Premium plan management, license renewal, and offline-first data sync."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix=settings.API_PREFIX)
app.include_router(licenses.router, prefix=settings.API_PREFIX)
app.include_router(sync.router, prefix=settings.API_PREFIX)
app.include_router(sales.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
