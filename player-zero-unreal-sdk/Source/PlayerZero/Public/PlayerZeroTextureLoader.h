#pragma once

#include "CoreMinimal.h"
#include "Engine/Texture2D.h"

class FFileApi;
struct FFileData;

DECLARE_DELEGATE_OneParam(FOnTextureLoaded, UTexture2D*);

class PLAYERZERO_API FPlayerZeroTextureLoader : public TSharedFromThis<FPlayerZeroTextureLoader>
{
public:

	FPlayerZeroTextureLoader();
	
	void LoadIconFromUrl(const FString& Url);
	UFUNCTION()
	void OnIconLoaded(const FFileData& File, const TArray<unsigned char>& Array);

	FOnTextureLoaded OnTextureLoaded;
private:
	TSharedPtr<FFileApi> FileApi;
	
};
