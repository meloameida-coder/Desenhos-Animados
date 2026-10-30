bl_info = {
    "name": "Lomi Studio - Biblioteca 3D",
    "author": "Lomi Studio",
    "version": (0, 2, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > Lomi",
    "description": "Prepara e organiza os modelos OBJ da biblioteca Lomi",
    "category": "Import-Export",
}

import bpy
import os
from mathutils import Vector
from bpy.props import StringProperty, BoolProperty
from bpy_extras.io_utils import ImportHelper

class LOMI_OT_import_obj( bpy.types.Operator, ImportHelper):
    bl_idname = "lomi.import_obj"
    bl_label = "Importar personagem OBJ"
    bl_description = "Importa um OBJ e organiza os objetos em uma coleção Lomi"
    filename_ext = ".obj"
    filter_glob: StringProperty(default="*.obj", options={"HIDDEN"})

    def execute(self, context):
        path = self.filepath
        before = set(bpy.data.objects)
        try:
            if bpy.app.version >= (4, 0, 0):
                bpy.ops.wm.obj_import(filepath=path, forward_axis="Y", up_axis="Z")
            else:
                bpy.ops.import_scene.obj(filepath=path, axis_forward="Y", axis_up="Z")
        except Exception as exc:
            self.report({"ERROR"}, "Falha ao importar OBJ: " + str(exc))
            return {"CANCELLED"}

        imported = [obj for obj in bpy.data.objects if obj not in before]
        if not imported:
            self.report({"WARNING"}, "O arquivo não criou objetos.")
            return {"CANCELLED"}

        name = os.path.splitext(os.path.basename(path))[0]
        collection = bpy.data.collections.get("Lomi - " + name)
        if collection is None:
            collection = bpy.data.collections.new("Lomi - " + name)
            context.scene.collection.children.link(collection)
        for obj in imported:
            for col in list(obj.users_collection):
                col.objects.unlink(obj)
            collection.objects.link(obj)
            obj.name = name + " - " + obj.name
        self.report({"INFO"}, f"{len(imported)} objeto(s) importado(s) para {collection.name}.")
        return {"FINISHED"}


class LOMI_OT_import_folder(bpy.types.Operator, ImportHelper):
    bl_idname = "lomi.import_folder"
    bl_label = "Importar todos os OBJ de uma pasta"
    bl_description = "Escolha um OBJ dentro da pasta; todos os OBJ dessa pasta serão importados"
    filename_ext = ".obj"
    filter_glob: StringProperty(default="*.obj", options={"HIDDEN"})

    def execute(self, context):
        folder = os.path.dirname(self.filepath)
        files = sorted(f for f in os.listdir(folder) if f.lower().endswith(".obj"))
        if not files:
            self.report({"WARNING"}, "Nenhum OBJ encontrado na pasta.")
            return {"CANCELLED"}
        count = 0
        for filename in files:
            path = os.path.join(folder, filename)
            before = set(bpy.data.objects)
            try:
                if bpy.app.version >= (4, 0, 0):
                    bpy.ops.wm.obj_import(filepath=path, forward_axis="Y", up_axis="Z")
                else:
                    bpy.ops.import_scene.obj(filepath=path, axis_forward="Y", axis_up="Z")
                imported = [obj for obj in bpy.data.objects if obj not in before]
                if imported:
                    name = os.path.splitext(filename)[0]
                    collection = bpy.data.collections.get("Lomi - " + name) or bpy.data.collections.new("Lomi - " + name)
                    if collection.name not in context.scene.collection.children:
                        context.scene.collection.children.link(collection)
                    for obj in imported:
                        for col in list(obj.users_collection):
                            col.objects.unlink(obj)
                        collection.objects.link(obj)
                        obj.name = name + " - " + obj.name
                    count += 1
            except Exception as exc:
                print("[Lomi] Erro ao importar", path, exc)
        self.report({"INFO"}, f"{count} arquivo(s) OBJ importado(s).")
        return {"FINISHED"}


class LOMI_OT_prepare_scene(bpy.types.Operator):
    bl_idname = "lomi.prepare_scene"
    bl_label = "Preparar cena de trabalho"
    bl_description = "Cria câmera, iluminação e configuração básica sem apagar objetos existentes"

    def execute(self, context):
        scene = context.scene
        if scene.camera is None:
            bpy.ops.object.camera_add(location=(0, -8, 2.8))
            camera = context.object
            camera.name = "Lomi - Câmera"
            camera.rotation_euler = (Vector((0, 0, 1.5)) - camera.location).to_track_quat("-Z", "Y").to_euler()
            scene.camera = camera
        bpy.ops.object.light_add(type="AREA", location=(0, -4, 6))
        light = context.object
        light.name = "Lomi - Luz principal"
        light.data.energy = 900
        light.data.shape = "DISK"
        light.data.size = 5
        scene.render.resolution_x = 1920
        scene.render.resolution_y = 1080
        scene.render.resolution_percentage = 100
        scene.render.fps = 24
        scene.frame_start = 1
        scene.frame_end = 96
        try:
            scene.render.engine = "BLENDER_EEVEE_NEXT"
        except Exception:
            try:
                scene.render.engine = "BLENDER_EEVEE"
            except Exception:
                pass
        self.report({"INFO"}, "Cena Lomi preparada. Nenhum personagem ou cena existente foi apagado.")
        return {"FINISHED"}


class LOMI_PT_panel(bpy.types.Panel):
    bl_label = "Lomi Studio"
    bl_idname = "LOMI_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Lomi"

    def draw(self, context):
        layout = self.layout
        layout.label(text="Biblioteca de personagens")
        layout.operator("lomi.import_obj", icon="IMPORT")
        layout.operator("lomi.import_folder", icon="FILE_FOLDER")
        layout.separator()
        layout.label(text="Preparação de produção")
        layout.operator("lomi.prepare_scene", icon="SCENE")
        layout.label(text="Rigging automático: etapa futura", icon="INFO")
        layout.label(text="Importação OBJ não cria esqueletos.", icon="INFO")


classes = (LOMI_OT_import_obj, LOMI_OT_import_folder, LOMI_OT_prepare_scene, LOMI_PT_panel)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()
