var SENDREQ = true

$(".style_tr").click( function() {
    $(".style_tr").removeAttr("style");
    $(this).attr({style:"background-color: #c8e4bf;"});

    console.log("i am fine");
    styleImg = $(this).find('img').eq(0); //$(this).children().find('img').eq(0);
    elementSrc = styleImg.attr("src");
    elementAlt = styleImg.attr("alt");
    elementStyleNum = styleImg.attr("style_name");
    console.log(elementSrc);
    $("#style_img").attr({src: elementSrc, alt: elementAlt, style_name: elementStyleNum});
    $("#style_image_name").text(elementAlt);
});

$("#change_style").click( function() {
    $("#ret_msg").html("");
    //console.log($(".file-preview-thumbnails").find("div").length);
    if ($(".file-preview-thumbnails").find("div").length == 0) {
        console.log("请先上传图片");
        $("#ret_msg").html("请先上传图片");
        window.alert("请先上传图片");
        return
    }
    var input_file = $(".kv-file-content").eq(0).children().eq(0);
    image_title = input_file.attr("title");
    style_name = $("#style_img").attr("style_name");
    image_src = ImgCompress(input_file, image_title);
    if (image_src == null) {
        image_src = input_file.attr("src");
    }
//    console.log(image_src);
//    console.log(image_title);
//    console.log(style_num);

    transdata = {}
    transdata["image_src"] = image_src;
    transdata["image_title"] = image_title;
    transdata["style_name"] = style_name;
    $("#change_style").html("转换中..");
    $("#ret_msg").html("waiting for image upload..");
    $("#change_style").attr({disabled:"disabled"});

    transdata = JSON.stringify(transdata)
    $.ajax({
        type: "POST",
        url: "/style_transfer/transfer",
        data: transdata,
        datatype: "json",
        success: function(ret) {
            //var ret = JSON.parse(retData);
            console.log(ret);
            if (ret.code == 201) {
                SENDREQ = true;
                //$("#transfered").attr({src: "/static/img/loading.gif"});
                $("#ret_msg").html(ret.msg);
                check_img(ret.img_key, image_title)
            } else {
                $("#ret_msg").html(ret.msg);
                $("#change_style").removeAttr("disabled");
                $("#change_style").html("风格转换");
            }
            //$("#transfered").attr({src: retData});
            //$("#change_style").removeAttr("disabled");
        }
    });
});

function check_img(img_key, image_title) {
    if ( !SENDREQ ) return;
    transdata = {}
    transdata["img_key"] = img_key
    transdata["image_title"] = image_title
    transdata = JSON.stringify(transdata)

    $.ajax({
        type: "POST",
        url: "/style_transfer/check_img",
        data: transdata,
        datatype: "json",
        success: function(ret) {
            //var ret = JSON.parse(retData);
            console.log(ret);
            if (ret.code == 200) {
                SENDREQ = false;
                $("#ret_msg").html(ret.msg);
                $("#change_style").removeAttr("disabled");
                $("#change_style").html("风格转换");
                $("#transfered").attr({src: ret.src});
            } else {
                check_img(img_key, image_title);
            }
        }

    });
}

$("#save_image").click( function() {
    if(/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
        window.alert("长按图片即可保存到本地");
    } else {
        window.alert("鼠标右键图片另存为即可保存到本地");
    }

});

/*上传之前对图片进行压缩
* 如果图片大小小于1M 不压缩
* 压缩之后比例不能改变
* */
function ImgCompress(imgObj, img_tittle) {
    img = imgObj.get(0); //将Jquery对象转换为DOM对象
    //1. 获取图片大小
    //img_size = parseInt($(".file-size-info").find("samp").html().match(/\d+/g)[0]);

    var img_width, img_height, img_width_c, img_height_c;
    if (typeof img.naturalWidth == "undefined") {
    　　// IE 6/7/8
        console.log("IE 6/7/8");
        img_width = img.width;
        img_height = img.height;
    } else {
    　　// HTML5 browsers
        console.log("HTML5 browsers");
        img_width = img.naturalWidth;
        img_height = img.naturalHeight;
    }
    console.log(img_width, img_height);
    if (img_width < 800 && img_height < 800) {
        return null;
    }

    if (img_width >= img_height) { //保证最长边不超过800像素
        img_width_c = 800;
        img_height_c = (img_width_c / img_width) * img_height;
    } else {
        img_height_c = 800;
        img_width_c = (img_height_c / img_height) * img_width;
    }
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = img_width_c;
    canvas.height = img_height_c;
    // 核心JS就这个
    context.drawImage(img,0,0,canvas.width,canvas.height);
    dot_index = img_tittle.lastIndexOf(".");
    img_suffix = img_tittle.substring(dot_index+1);
    suffix_type_dic = {"jpg": "jpeg", "png": "png", "gif": "gif"}
    //console.log(img_suffix);
    var base64 = canvas.toDataURL('image/' + suffix_type_dic[img_suffix]);
    //console.log(base64);
    return base64
}