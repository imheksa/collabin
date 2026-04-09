#pragma once

#include "CoreMinimal.h"
#include "glTFRuntimeAsset.h"
#include "Animation/AnimInstance.h"
#include "Components/ActorComponent.h"
#include "PlayerZeroLoaderComponent.generated.h"

struct FAvatarConfig;
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAvatarLoadComplete, USkeletalMeshComponent*, LoadedMeshComponent);

UCLASS( ClassGroup=(Custom), meta=(BlueprintSpawnableComponent) )
class PLAYERZERO_API UPlayerZeroLoaderComponent : public UActorComponent
{
	GENERATED_BODY()
	
public:
	UPlayerZeroLoaderComponent();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta=(AllowAbstract = "false"))
	TSubclassOf<UAnimInstance> AnimationBlueprint;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString AvatarId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	USkeletalMeshComponent* TargetMeshComponent;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	USkeleton* TargetSkeleton;

	UPROPERTY(BlueprintAssignable, Category = "Player Zero")
	FOnAvatarLoadComplete OnAvatarLoadComplete;

	UFUNCTION(BlueprintCallable, Category = "Player Zero")
	void LoadAvatar( const FAvatarConfig& Config);

	UFUNCTION(BlueprintCallable, Category = "Player Zero")
	void ReplaceMeshWithGltfAsset(UglTFRuntimeAsset* GltfAsset);
	
	void LogSkeletonCompatibility(USkeletalMesh* Mesh, USkeleton* ExpectedSkeleton);
	
protected:
	virtual void BeginPlay() override;

};
