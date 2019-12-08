from django.shortcuts import render

# Create your views here.
from django.conf import settings
from .apps import StyleTransferConfig
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
import json, os, base64, time

from .vendor.style.evaluate import style_rendering
import hashlib

from multiprocessing import Pool
from multiprocessing import Process

# num = 3
# pool = Pool(num)# num表示进程池的大小


'''
渲染API
'''


def rendering(ckpt=None, in_path=None, out_path=None):
    # 这里就阻塞吧，反正是在独立的进程中
    style_rendering(ckpt=ckpt, in_path=in_path, out_path=out_path)


'''
创建进程去执行
'''


def pool_exec(**args):  # **args 表示把参数转换为字典格式
    p = Process(target=rendering, kwargs=args)
    print(args)
    p.start()


# pool.apply_async(rendering, kwds=args)

def get_unique_key(img_name):
    a = str(time.time())
    b = hashlib.md5()
    b.update((img_name + a).encode("utf-8"))
    c = b.hexdigest()[-5:]
    # print(type(c), c)
    return c


def d_base64(origStr):
    # base64 decode should meet the padding rules
    # 去掉前面的标识 image_src = image_src.replace('data:image/png;base64,','') #去掉前面的标识
    origStr = origStr[origStr.find("base64,") + 7:]

    if (len(origStr) % 3 == 1):
        origStr += "=="
    elif (len(origStr) % 3 == 2):
        origStr += "="

    origStr = bytes(origStr, encoding='utf8')
    dStr = base64.b64decode(origStr)
    return dStr


def index(request):
    return render(request, StyleTransferConfig.name + '/index.html')


@csrf_exempt  # 跳过 csrf 中间件的保护
def check_img(request):
    ret = {"code": 201, "msg": "waiting"}
    post_data = json.loads(request.body)
    img_key = post_data['img_key']
    image_title = post_data['image_title']
    img_path = os.path.join(settings.BASE_DIR,StyleTransferConfig.name +"/static/" + StyleTransferConfig.name + "/generate_images/" + img_key + "_" + image_title)

    # hold住请求，不然太多请求过来了
    expired_time = 3
    while expired_time > 0:
        if os.path.exists(img_path):
            time.sleep(1)  # 权宜之计，因为此时文件虽然存在但可能没渲染完成。
            ret["code"] = 200
            ret["msg"] = "success"
            ret["src"] = "/static/"+StyleTransferConfig.name +"/generate_images/" + os.path.basename(img_path)
            return JsonResponse(ret)
        else:
            time.sleep(1)
            expired_time -= 1
    # 跳出while 说明超时
    return JsonResponse(ret)


@csrf_exempt  # 跳过 csrf 中间件的保护
def transfer(request):
    ret = {"code": -1, "msg": "未知错误"}
    # return JsonResponse(ret)
    post_data = json.loads(request.body)
    image_src = post_data['image_src']
    image_title = post_data['image_title']
    style_name = post_data['style_name']

    imgdata = d_base64(image_src)
    image_save_path = os.path.join(settings.BASE_DIR, StyleTransferConfig.name + "/static/"+ StyleTransferConfig.name +"/upload_images/" + image_title)  # 图片路径
    print(image_save_path)
    with open(image_save_path, 'wb') as f:
        f.write(imgdata)

    '''
        这里改为多进程模型，前端提出渲染请求后，fork出子进程去执行，然后立即返回不阻塞。 可以增加两种模型性能对比。
        前端改为定时去询问后端是否渲染完成。

    '''
    img_size = os.path.getsize(image_save_path)
    if img_size > 1 * 1024 * 1024:
        ret["code"] = -1
        ret["msg"] = "error: img size too large"
        return JsonResponse(ret)

    # os.system()
    img_key = get_unique_key(image_title)
    image_generate_path = os.path.join(settings.BASE_DIR,StyleTransferConfig.name +
                                       "/static/"+StyleTransferConfig.name +"/generate_images/" + img_key + "_" + image_title)  # 图片路径
    print(image_generate_path)
    ckpt = os.path.join(settings.BASE_DIR, StyleTransferConfig.name + "/vendor/style/examples/checkpoints/" + style_name)
    print(ckpt)

    if os.path.exists(ckpt) or os.path.exists(ckpt+".meta"):
        pool_exec(ckpt=ckpt, in_path=image_save_path, out_path=image_generate_path)
        ret["code"] = 201
        ret["img_key"] = img_key
        ret["msg"] = "waiting for rendering..."
        return JsonResponse(ret)
    else:
        ret["code"] = -1
        ret["msg"] = "error: style image not found!"
        return JsonResponse(ret)




