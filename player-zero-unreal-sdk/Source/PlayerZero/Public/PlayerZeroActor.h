// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "glTFRuntimeAsset.h"
#include "PlayerZeroCharacterTypes.h"
#include "PlayerZeroActor.generated.h"

UCLASS()
class PLAYERZERO_API APlayerZeroActor : public AActor
{
	GENERATED_BODY()
	
public:	
	APlayerZeroActor();
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Meta = (ExposeOnSpawn = true), Category = "Player Zero")
	FPlayerZeroAnimationConfig AnimationConfig;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Meta = (ExposeOnSpawn = true), Category = "Player Zero")
	TMap<FString, FPlayerZeroAnimationConfig> AnimationConfigsByStyleId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Meta = (ExposeOnSpawn = true), Category = "Player Zero|Glb Import Settings")
	FglTFRuntimeStaticMeshConfig StaticMeshConfig;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Meta = (ExposeOnSpawn = true), Category = "Player Zero|Glb Import Settings")
	FglTFRuntimeSkeletalMeshConfig SkeletalMeshConfig;

	FPlayerZeroCharacterData CharacterData;
	
	UFUNCTION(BlueprintCallable, Category = "Player Zero")
	virtual void LoadCharacter(const FPlayerZeroCharacterData& InCharacterData, UglTFRuntimeAsset* GltfAsset);
	
	UFUNCTION(BlueprintCallable, Category = "Player Zero")
	void RemoveAllMeshes();
	
	virtual void Tick(float DeltaTime) override;

protected:
	TWeakObjectPtr<USkeletalMeshComponent> MasterPoseComponent;
	
	virtual void BeginPlay() override;

	template<typename T>
	FName GetSafeNodeName(const FglTFRuntimeNode& Node)
	{
		return MakeUniqueObjectName(this, T::StaticClass(), *Node.Name);
	}
	
private:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, meta = (AllowPrivateAccess = "true"), Category="Player Zero")
	USceneComponent* AssetRoot;

	TArray<USceneComponent*> LoadedMeshComponents;
	
	TArray<USceneComponent*> LoadMeshComponents(UglTFRuntimeAsset* GltfAsset);
	USkeletalMeshComponent* CreateSkeletalMeshComponent(UglTFRuntimeAsset* GltfAsset, const FglTFRuntimeNode& Node);
	UStaticMeshComponent* CreateStaticMeshComponent(UglTFRuntimeAsset* GltfAsset, const FglTFRuntimeNode& Node);

};
