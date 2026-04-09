#pragma once

class UImage;

class PLAYERZERO_API FPlayerZeroImageHelper
{
public:
	static UTexture2D* CreateTextureFromData(const TArray<uint8>& ImageData);
	static UImage* CreateUImageFromData(const TArray<uint8>& ImageData, const FVector2D& ImageSize);
	static void LoadDataToUImage(const TArray<uint8>& ImageData, UImage* Image);
	static void LoadTextureToUImage(UTexture2D* Texture, const FVector2D& ImageSize, UImage* Image);
	static void LoadDataToSImage(const TArray<uint8>& ImageData, const FVector2D& ImageSize, TSharedPtr<SImage> ImageWidget);
	static void LoadTextureToSImage(UTexture2D* Texture, const FVector2D& ImageSize, TSharedPtr<SImage> ImageWidget);
};
