Project name: Lumiere - Lighting and composing a street scene

Basic rundown:

Lumiere consists of a 3D scene of an unlit urban road against a starry sky backdrop. The 3D scene will consist of a road with lane markings, a puddle, buildings, and sidewalks. The user can then choose from a library of light sources to add to the scene that will match different images of cities. The user can also click and drag dummy people and basic cars with headlights to add to the composition. While the user sets up the scene, a Claude Vision API scores its lighting based on its similarity to the provided image. The user wins if they score above 80% and has to keep going otherwise. It’s ultimately a lighting sandbox where the user can play around with the lighting of a street scene with the goal of achieving the lighting of another scene. Potential additions (if time permits) include allowing the user to upload their own 2D image as a backdrop that can be relit through depth-estimation-models, as well as using physically based rendering instead of a standard phong model.

User Interaction: 

The user will first be presented with a flatlit scene with a button that gives them a choice of night or day. On the side of the screen, a model image will be shown. On the left side of the screen, two columns of buttons will be shown. The first column will show cars and dummy people that, once clicked upon, will make them appear in the foreground of the scene. The second column will show the different lights that they can add. These will consist of a moon (hemisphere light), a sun (directional light), lamp post (spotlight), neon signs (point lights with neon colors), tungsten (directional light with warm colors), HMI (directional light with cool colors), and window lights (RectAreaLights, dragged onto windows in nearby buildings). These lights can be clicked and dragged from the column and moved with their mouse around anywhere in the sandbox. If they want to change the direction that the light points, they can hold shift and drag the pointed direction around. The user can also click and press ‘X’ to delete them. The user will also be able to move around the scene with WASD keys. At the bottom of the screen, a button called “Check” can be clicked, which prompts the AI to score the scene based on its similarity in lighting and composition against the provided image. If they score below 80, they will be prompted to keep going.

If time allows…

We will definitely build the lighting sandbox with the 3D scene, but the custom 2D image backdrop that can be relit using depth estimation models may be cut if we are short on time. We’ll also make this in Phong and only add the physically based rendering after.

Advanced features:

Shadow mapping with two-pass z-buffer algorithms, the first pass for the closest surface at each pixel and the second pass for seeing if the point is visible from light or behind something
Claude Vision API scores lighting similarity between the user’s scene and the reference image by comparing both as screen shots and returning a score between 0 to 100 with a brief line of feedback
(If time permits) PBR Shader using Cook-Torrance BRDF instead of Phong
(If time permits) Backdrop relighting based on Depth Anything V2 that gets the per-pixel depth of the backdrop image, and uses the cross product of change in depth across x and y axes to get the surface normals of the scene. The lighting is then reevaluated for every pixel to make it respond to the same lights as those applied to the 3D scene.

Course topics used: 

Matrix transformations - positioning lights and changing the camera view
Rendering pipeline - vertex to fragment pipeline for the scene geometry
Projections and viewing - for the vanishing point effect in the road
Lighting and illumination - extending Phong model to the Cook-Torrance BRDF for physically based rendering (only really applied to the road and the lamppost)
Smooth shading and interpolation - per-vertex normals on city features that interpolates across triangles to create smoother lighting effects
Texture mapping - generated backdrop image would be mapped onto a texture of the backdrop plane
Bump mapping - normals for each individual pixel gotten from a depth map to relight the backdrop image
Shadow mapping - z-buffer shadows from the light sources, mainly for lampposts, cars, people etc.
