# Content Validation Schemas

This repository contains and serves JSON schemas that validate abstracted data of 3D content for compatibility with Ready Player Me integrations.

## Serving Schemas

The schemas are served using the [gh-pages](https://pages.github.com/) feature.
THIS MAY QUITE PROBABLY CHANGE IN THE FUTURE.

By serving the schemas publicly, they can be utilized as a single source of truth across different validation tools for compatibility of content with Ready Player Me integrations.

The advantage of this compared to reading it directly from the raw content URLs:  
_Caching_: When using the raw content URL to access a JSON schema file, the file is served directly from GitHub's servers each time it is requested.
This can result in slower performance and increased bandwidth usage, especially if your schema files are large or heavily accessed.
In contrast, when using the "gh-pages" approach, the schema files can be cached by users' web browsers or by caching servers, resulting in faster performance and lower bandwidth usage over time.

_Access controls_: When serving JSON schemas using the raw content URL, they are publicly accessible to anyone who has the URL.
In contrast, when using the "gh-pages" approach, access controls can be implemented using GitHub Pages settings or custom code to restrict who can access the schema files.

_URL structure_: The raw content URL for a JSON schema file can be quite long and difficult to remember or share, especially if there are many schema files in the repository.
In contrast, when using the "gh-pages" approach, a custom URL structure can be created that is easier to remember and share with others.

## JSON Instances

The JSON instances that are to be tested against the schemas are generated using a custom solution to gather and abstract data from the 3D files.

## Validation

The JSON schemas are primarily meant to be used with the [ajv](https://ajv.js.org/) validator, since they use custom [errors](https://ajv.js.org/packages/ajv-errors.html) supported by the package.
