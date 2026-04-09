# 📦 Player Zero SDK for Unreal Engine

The Player Zero SDK makes it easy to load and display Ready Player Me avatars in Unreal Engine. It supports avatar loading, shortcodes, and render capture.

---

## ✅ Requirements

- Unreal Engine **5.0 or later**
- **Visual Studio 2022**
- [glTFRuntime Plugin](https://github.com/rdeioris/glTFRuntime)

---

## 🚀 Installation Guide
1. **Download the SDK**  
   Get the latest release from the [Releases Page](https://github.com/readyplayerme/player-zero-unreal-sdk/releases).
2. **Add to Plugins Folder**  
   Extract the contents of the ZIP file into your project’s `Plugins` directory: `YourProject/Plugins/PlayerZeroSdk/`
3. **Install glTFRuntime**
- Clone or download the [glTFRuntime plugin](https://github.com/rdeioris/glTFRuntime).
- Place it inside your `Plugins` folder alongside the PlayerZero SDK:
  `YourProject/Plugins/glTFRuntime/`
4. **Build the Project**  
   Open your project’s `.uproject` file. When prompted, choose to build the project in Visual Studio 2022.

    Alternatively, open the `.sln` file in Visual Studio and build the entire solution manually.

5. **Enable the Plugin**
- Launch the Unreal Editor.
- Go to **Edit > Plugins**
- Search for **Player Zero SDK** and enable it.
- Restart the editor when prompted.

---

## ⚙️ Plugin Setup & Configuration

After importing the PlayerZero SDK plugin, follow these steps to complete your setup.

---

### 🛠️ 1. Open the Developer Window

<img width="696" height="111" alt="Screenshot 2025-08-11 083310" src="https://github.com/user-attachments/assets/7d0fbb5c-64d2-4790-a101-ef20accc2dea" />

You can access the custom editor window from the top toolbar:

> **Player Zero ➜ Developer Window**

This opens the **PlayerZero Developer Login** panel.

<img width="510" height="357" alt="Screenshot 2025-08-11 083328" src="https://github.com/user-attachments/assets/95c26241-253e-4da6-b8c5-b5e32ae78682" />

---

### 🔐 2. Sign in With Your Developer Account

Use your PlayerZero Developer account credentials:

- **Email**
- **Password**

Once logged in:

- You’ll see a **dropdown** containing all applications linked to your account.
- Select the **application** you want this project to be associated with.
- Your **existing character blueprints** will be displayed visually (IDs only, non-interactable).

<img width="1003" height="584" alt="image" src="https://github.com/user-attachments/assets/776aa701-6b2d-48df-b96a-04abbf61faa6" />

---

### ⚙️ 3. Configure Plugin Settings

Go to:

> **Project Settings ➜ Game ➜ Player Zero Settings**

Here’s what you’ll find:

| Setting                | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| **Api Base Url**       | (Auto-set) URL for API requests. No need to change this.                    |
| **Api Base Auth Url**  | (Auto-set) Auth URL. No need to change this.                                |
| **Application Id**     | Auto-filled after sign-in. **Do not change manually unless instructed.**    |
| **Game Id**            | 🔴 **Required.** Used to track analytics and earnings. Contact us to get it. |
| **Default Avatar Id**  | Optional fallback avatar ID to use if none is set during load.              |

> ⚠️ Make sure your **Game Id** is set correctly — this is essential for revenue tracking!

<img width="938" height="281" alt="image" src="https://github.com/user-attachments/assets/60b6734d-0750-4d82-a296-eb472e346388" />

---

### ✅ Summary

| Step | Action                                       |
|------|----------------------------------------------|
| 1    | Open **Developer Window**                   |
| 2    | Log in with your **PlayerZero** account     |
| 3    | Select your **Application**                 |
| 4    | Go to **Project Settings ➜ Player Zero**    |
| 5    | Verify Application ID and set **Game ID**   |
| 6    | (Optional) Set a **Default Avatar ID**      |

Once this is done, you’re ready to start using the **PlayerZero avatar and analytics tools** in your game.

---

## 🧪 Next Steps

- To verify installation, open the included **demo map**:
  `Content/PlayerZeroSdk/Maps/PlayerZeroDemo.umap`
- Check the documentation below to learn how to load avatars and avatar renders.


## 🎮 Demo Map: Testing the PlayerZero SDK

The plugin includes a sample map that demonstrates the full PlayerZero avatar loading and image rendering pipeline.

---

### 📍 Location

You can find the demo map inside the Player Zero plugin folder under: `Content/PlayerZeroDemo.umap`.

---

### 🧪 How to Open the Demo

1. In the **Content Browser**, navigate to:  
   `Content > PlayerZeroSdk > Maps`

2. Double-click on `PlayerZeroDemo` to open the map.

---

### 🎭 Map Setup

<img width="1191" height="820" alt="Screenshot 2025-08-11 083436" src="https://github.com/user-attachments/assets/b05cdbb2-488f-481c-97c5-b42105c007f0" />


The map contains:

#### 🧱 `BP_PlayerZeroDemoActor`
- Found in the **World Outliner**
- Includes a `PlayerZeroLoaderComponent` which handles avatar loading
- In the Details panel, you can set:
    - `AvatarId`: Will auto-load the avatar on **BeginPlay**
    - `TargetSkeleton`: Optional skeleton for retargeting
    - `AnimationBlueprint`: Optional animation controller

---

### 🖼️ UI Widget: `WBP_PlayerZeroDemo`

- Automatically added to viewport in the **Level Blueprint**
- Contains:
    - `BP_AvatarCode` widget with a **text input field**
        - Input a shortcode and press Enter to fetch the corresponding avatar
    - **Avatar Image Preview**
        - Displays an avatar thumbnail loaded using the `LoadAvatarImageAsync` Blueprint node

---

### ✅ Testing the Demo

1. Press **Play** in the editor.
2. If `AvatarId` was set in `BP_PlayerZeroDemoActor`, an avatar should appear.
3. Test shortcode input:
    - Enter a valid **Avatar Code** into the input field
    - If successful, the avatar ID will be fetched and the avatar image will appear

---

### 💡 Pro Tip

You can extend the demo setup or use the `PlayerZeroLoaderComponent` and Blueprint nodes (`LoadAvatarImageAsync`) in your own UI or gameplay logic.

---
# Documentation
## 🎮 PlayerZeroLoaderComponent

The PlayerZeroLoaderComponent is a self-contained component that allows you to load a Ready Player Me avatar using an AvatarId and automatically attach it to your actor at runtime.
🚀 Features:
- Automatically loads a skeletal mesh from a glTF avatar asset
- Attaches the avatar to your actor using a SkeletalMeshComponent
- Supports assigning an animation blueprint
- Compatible with custom skeletons for advanced retargeting setups
- Blueprint and C++ compatible

---

## 🧩 Using PlayerZeroLoaderComponent (Blueprints)

The PlayerZeroLoaderComponent lets you load a Ready Player Me avatar in Blueprints with minimal setup. Add it to your actor, configure a few properties, and call LoadAvatar().

✅ 1. Add the Component

- Open your Blueprint actor (e.g. BP_Character, BP_Viewer).
- Click Add Component → search for PlayerZeroLoaderComponent.
- Name it something like AvatarLoader.

---
🧷 2. Set Up Required Properties

In the Details Panel of the AvatarLoader:

| Property              | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `Avatar Id`           | The Ready Player Me avatar ID (**required**).                               |
| `Animation Blueprint` | *(Optional)* Assign an animation blueprint class to drive the avatar.       |
| `Target Skeleton`     | *(Optional)* If using retargeting, assign your target skeleton here.         |
| `Target Mesh Component` | *(Optional)* Mesh to replace. If left empty, one will be auto-detected.     |

--- 

▶️ 3. Load the Avatar

Call Load Avatar in your Blueprint, for example:
Example: In BeginPlay

**Event BeginPlay** → **Load Avatar**

Or tie it to a UI Button press, login event, etc.

---

📣 4. Respond to Load Completion

Bind to the On Avatar Load Complete event in the component to detect when the avatar has finished loading.

AvatarLoader → On Avatar Load Complete (Event)
→ Do something with the loaded mesh (e.g., play animation, show UI, etc.)

The event passes the loaded SkeletalMeshComponent as a parameter.
💡 Tips
- If Target Skeleton is set, the avatar mesh will be validated against it (you’ll see warnings if bones don’t match).
- If your actor has no SkeletalMeshComponent, one will be created and attached automatically.
- This component is non-ticking and lightweight.

---

## 📡 Async Actions in Player Zero SDK

The Player Zero SDK provides several async actions for loading and managing avatars in Unreal Engine. These actions can be used in Blueprints to handle various avatar-related tasks, such as loading an avatar, its image, metadata, or assets, and responding to success or failure events. Below are examples of how to use these async actions.

### 1. Loading Avatar Asset

<img width="328" height="188" alt="image" src="https://github.com/user-attachments/assets/2b3f416c-71ed-4d3f-a456-1a8980a17699" />

Use this action to load an avatar from an avatar ID. It returns a UglTFRuntimeAsset which contains all the data needed to load the avatar. For example using the `UPlayerZeroLoaderComponent::ReplaceMeshWithGltfAsset`  function. 

- **On Success:** OnCompleted event is triggered with the loaded asset (UglTFRuntimeAsset).
- **On Failure:** OnFailed event is triggered if the load fails.

Example Usage in Blueprint:

<img width="1207" height="641" alt="Screenshot 2025-08-11 100244" src="https://github.com/user-attachments/assets/41a6b5c9-037e-4459-ab69-aa756ac12c38" />

### 3. Loading Avatar Image

<img width="942" height="582" alt="Screenshot 2025-08-11 100534" src="https://github.com/user-attachments/assets/1dfbd6a1-f472-45a9-ace4-be4b1ceaf132" />

Use this action to asynchronously load an avatar's image as a `UTexture2D`.

- **On Success:** OnCompleted is triggered with the loaded texture.
- **On Failure:On Failure:** OnFailed is triggered if the image load fails.

### 4. Loading Avatar Metadata

<img width="403" height="180" alt="Screenshot 2025-08-11 100439" src="https://github.com/user-attachments/assets/8f60ad8a-7611-4e11-b43e-36afe2d7c1b3" />

Use this action to load metadata for an avatar. This is useful for getting things like icon url, model url (.glb model) etc.

- **On Success:** OnCompleted is triggered with the loaded metadata.
- **On Failure:** OnFailed is triggered if the metadata load fails.


### 6. Getting Avatar ID from Code

<img width="451" height="235" alt="image" src="https://github.com/user-attachments/assets/642d4878-4742-4a60-aa1e-ee91c71c549b" />

Use this action to get the Avatar ID from an avatar shortcode. 

- **On Success:** OnCompleted is triggered with the Avatar ID.
- **On Failure:** OnFailed is triggered if the shortcode is invalid.

### 💡 Tips for Using Async Actions

- **Ensure proper event handling:** Bind your success (OnCompleted) and failure (OnFailed) events to appropriate functions to handle different cases.
- **Load asynchronously:** Use the async actions to load avatars, images, and data in the background, preventing UI freezes or lag during runtime.
- **Optimize for performance:** For large avatar assets or images, consider preloading or loading in smaller chunks.


