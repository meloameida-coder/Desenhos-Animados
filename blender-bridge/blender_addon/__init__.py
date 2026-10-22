bl_info = {
    "name": "Desenhos Animados - Cena de Teste",
    "author": "Desenhos Animados",
    "version": (0, 1, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > Desenhos",
    "description": "Cria uma cena 3D simples para validar o Blender",
    "category": "3D View",
}

import bpy
from mathutils import Vector


class DESENHOS_OT_create_test_scene(bpy.types.Operator):
    bl_idname = "desenhos.create_test_scene"
    bl_label = "Criar cena de teste"

    def execute(self, context):
        # Não apaga cenas existentes nem altera projetos já salvos.
        scene = bpy.data.scenes.new("Desenhos - Cena de Teste")
        context.window.scene = scene

        def mat(name, color):
            material = bpy.data.materials.new(name)
            material.diffuse_color = (*color, 1)
            material.use_nodes = True
            node = material.node_tree.nodes.get("Principled BSDF")
            if node:
                node.inputs["Base Color"].default_value = (*color, 1)
                node.inputs["Roughness"].default_value = 0.6
            return material

        def cube(name, location, scale, material):
            bpy.ops.mesh.primitive_cube_add(size=1, location=location)
            obj = context.object
            obj.name = name
            obj.dimensions = scale
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            obj.data.materials.append(material)
            bevel = obj.modifiers.new("Bordas suaves", "BEVEL")
            bevel.width = 0.08
            bevel.segments = 3
            obj.modifiers.new("Normais suaves", "WEIGHTED_NORMAL")
            return obj

        ground = mat("Verde floresta", (0.12, 0.30, 0.16))
        purple = mat("Moletom roxo", (0.38, 0.10, 0.68))
        gray = mat("Pelo cinza", (0.52, 0.55, 0.60))
        pink = mat("Orelhas rosa", (0.95, 0.28, 0.48))
        skin = mat("Pele", (0.85, 0.63, 0.48))

        cube("Chão", (0, 0, -0.25), (12, 12, 0.5), ground)
        cube("Menina - corpo provisório", (-1, 0, 0.8), (0.65, 0.45, 1.5), purple)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.38, location=(-1, 0, 1.75))
        bpy.context.object.name = "Menina - cabeça provisória"
        bpy.context.object.data.materials.append(skin)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.42, location=(1, 0, 0.45))
        bpy.context.object.name = "Coelho - corpo provisório"
        bpy.context.object.data.materials.append(gray)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.28, location=(1, 0, 0.92))
        bpy.context.object.name = "Coelho - cabeça provisória"
        bpy.context.object.data.materials.append(gray)
        for x in (0.82, 1.18):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.10, location=(x, 0, 1.28))
            ear = context.object
            ear.name = "Orelha rosa provisória"
            ear.scale = (0.55, 0.6, 2.8)
            ear.data.materials.append(pink)

        bpy.ops.object.light_add(type="AREA", location=(0, -4, 7))
        light = context.object
        light.name = "Luz suave"
        light.data.energy = 850
        light.data.shape = "DISK"
        light.data.size = 5

        bpy.ops.object.camera_add(location=(0, -9, 3.5))
        camera = context.object
        camera.name = "Câmera de teste"
        camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = camera
        scene.render.resolution_x = 1280
        scene.render.resolution_y = 720
        scene.render.resolution_percentage = 50
        scene.render.fps = 24
        scene.frame_start = 1
        scene.frame_end = 48
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.filepath = "//desenhos-teste.mp4"
        try:
            scene.render.engine = "BLENDER_EEVEE_NEXT"
        except Exception:
            try:
                scene.render.engine = "BLENDER_EEVEE"
            except Exception:
                pass
        self.report({"INFO"}, "Cena de teste criada. Salve o arquivo .blend antes de renderizar.")
        return {"FINISHED"}


class DESENHOS_PT_panel(bpy.types.Panel):
    bl_label = "Desenhos Animados"
    bl_idname = "DESENHOS_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Desenhos"

    def draw(self, context):
        self.layout.label(text="Teste inicial do Blender")
        self.layout.operator("desenhos.create_test_scene", icon="SCENE")


classes = (DESENHOS_OT_create_test_scene, DESENHOS_PT_panel)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
