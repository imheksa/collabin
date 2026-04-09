// Copyright Epic Games, Inc. All Rights Reserved.

using UnrealBuildTool;

public class PlayerZero : ModuleRules
{
	public PlayerZero(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;
		
		PublicIncludePaths.AddRange(
			new string[] {
				// ... add public include paths required here ...
			}
			);
				
		
		PrivateIncludePaths.AddRange(
			new string[] {
				// ... add other private include paths required here ...
			}
			);
			
		
		PublicDependencyModuleNames.AddRange(
			new string[]
			{
				"Core",
				"glTFRuntime",
				"Slate",
				"SlateCore",
				"StreamingFile", 
				"ImageDownload"
			}
			);
			
		
		PrivateDependencyModuleNames.AddRange(
			new string[]
			{
				"CoreUObject",
				"Engine",		
				"Json",
				"JsonUtilities",
				"HTTP",
				"UMG",
				"Projects",
				"ImageWrapper",
				"DeveloperSettings",
			}
			);
		
		
		DynamicallyLoadedModuleNames.AddRange(
			new string[]
			{
				// ... add any modules that your module loads dynamically here ...
			}
			);
	}
}
