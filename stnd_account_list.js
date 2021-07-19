/*
	##### 수정로그 #####
	2021.06.01 김현중 신규
*/
//LAYOUT
var layout = new dhx.Layout("layout", { //LAYOUT
	type: "space",
	cols: [
		{
			id: "account_type",
			width: "20%"
		},
		{
			type: "none",
			width: "78%",
			rows: [
				{
					id: "account_list",
					height:"94.3%",
				},
				{
					id: "pagination",
					height:"6%",
				},
			]
		}	
	]
});

//ONLOAD 데이터 파싱
$(function(){ //DATA PARSE
	select_account_type(function (type){
		type_parse(type);
	});
	var account_list = select_account('all'); // 초기화면 select all
	account_parse(account_list) // parse
});

/***************************************************** 거래처 구분 시작**************************************************************/
//거래처구분 select
function select_account_type(callback_type){
	var type = '';
	var data_array = new Array();
	var data_info = new Object(); 
	data_info.table = 'stnd_account_type';
	data_info.column = '*';
	data_info.order = {'stacty_uid':'desc'};
	data_array.push(data_info);
	var loadData = select_common(type, data_array);	
	if(loadData.result == 'success'){
		callback_type(loadData);
	}else{
		d_alert("거래처 구분리스트를 불러오지 못했습니다. 관리자에게 문의해 주세요.");
	}
};

//거래처구분 select 후 파싱 함수
function type_parse(loadData){
	const grid = new dhx.Grid("", {
		columns: [
			{ id: "stacty_uid", header: [{ text: "거래처 구분 고유번호"}], hidden : true},
			{ id: "stacty_nm", header: [{ text: "거래처 구분" }]},
			{
				id: "option", sortable: false, header: [{ text: '<div style="width: 50px; height: 31px;"><i class="dxi dxi-plus"> </i><div>', align: "center" }],
				htmlEnable: true, align: "center",
				width:50,
				template: function () {
					return "<div class='action-buttons'><a class='remove-button-type'><i class='dxi dxi-minus'> </i></a></div>"
				}
			},
		],
		selection: true,
		editable: true,
		autoWidth: true, 
		data: loadData.data.stnd_account_type,
	});
	layout.getCell("account_type").attach(grid);
	//Header '+' 거래처 구분 추가
	grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			type_window();
		}
	});
	grid.events.on("cellClick", function(row,column,e){
		var uid = row.stacty_uid;
		var stacty_nm = row.stacty_nm;
		if(column.id == 'option'){
			deleteSpan(uid)
		}else{
			var account_list = select_account(uid); // row 클릭시 오른쪽 레이아웃에 거래처 리스트 select
			account_parse(account_list, stacty_nm, uid ) // parse
		}
	});

    grid.events.on("afterEditEnd", async function (value,obj) { //구분명 AutoUpdate
		try{
			var await_result = await update_type(value, obj.stacty_uid);
			var account_list = select_account(await_result); // row 클릭시 오른쪽 레이아웃에 거래처 리스트 select
			account_parse(account_list, value, await_result) // parse
		}catch(e){
			console.log(e);
		}
    });
}

//거래처구분 삭제
function deleteSpan(uid){
	d_confirm("거래처 구분을 삭제하실 경우 해당 모든 거래처의 품목, 담당자, 영업 정보가 삭제됩니다. </br> 정말로 삭제하시겠습니까??", function(chk){
		if(chk == true){
			if(uid != null){
				var data_array = new Array();
				var data_info = new Object();
				data_info.table = 'stnd_account_type';
				data_info.column = 'stacty_uid';
				data_info.column_value = [uid];
				data_array.push(data_info);
				var del_info = delete_common(data_array);
				if(del_info.result == 'success'){ //거래처 구분 삭제
					var select_chk = select_account(uid);
					if(!Array.isArray(select_chk.data)){
						for(i=0; i < select_chk.data.stnd_account.length; i++){
							var item_chk = select_account_item(select_chk.data.stnd_account[i].stac_uid);// 하위테이블 중 품목 삭제 전에 품목별 uid select
							var delete_chk = delete_account(select_chk.data.stnd_account[i].stac_uid); //거래처 삭제 및 하위테이블 삭제
							if(delete_chk == 'fail'){
								return false;
							}else{ //성공했을 시 마지막으로 거래처별 품목에 대한 가격이력 삭제
								if(!Array.isArray(item_chk.data)){
									var item_list = item_chk.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item'];
									var stacit_arr = new Array();
									for(k = 0; k < item_list.length; k++){
										stacit_arr.push(item_list[k].stacit_uid);
									}
									var price_chk = del_account_item_rel('stacit_uid', stacit_arr);
									if(price_chk == 'fail'){
										return false;
									}
								}
							}
						}
					}
					d_alert("삭제가 완료되었습니다.");
					select_account_type(function (type){
						type_parse(type);
					});
					var account_list = select_account('all'); // 초기화면 select all
					account_parse(account_list) // parse
				}else {
					d_alert("삭제에 실패하였습니다.");
				}
			}else{
				d_alert("데이터 정보가 존재하지 않습니다. 관리자에게 문의해 주세요.");
			}
		}else{
			d_alert("거래처 구분 삭제가 취소되었습니다.");
		}
	});
}

//거래처구분 추가 Window창
function type_window(){
	const form = new dhx.Form("", {
		css: "dhx_widget--bordered",
		width: 450,
		padding: 40,
		rows: [
			{
				name: "stacty_nm",
				type: "input",
				required: true,
				placeholder: "거래처 구분명을 입력해 주세요.",
				errorMessage: "빈칸을 입력할 수 없습니다.",
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: "저장",
						size: "medium",
						view: "flat",
						color: "primary",
						url: "./?json=ajax_for_dhtmlx_form",
					}
				]
			}
		]
	});
	const dhxWindow = new dhx.Window({
		width: 440,
		height: 300,
		title: "거래처 구분 등록",
		movable: true,
		closable: true,
	});
	dhxWindow.attach(form);
	dhxWindow.show();
	form.events.on("AfterSend", function(){
		var formData = form.getValue();
		insert_type(formData, form, dhxWindow);
	});
}
//거래처 구분 등록
function insert_type(formData, form, dhxWindow){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_type';
	data_info.column = [{'stacty_nm':formData.stacty_nm, 'stacty_memuid':'', 'stacty_regdate':''}];
	data_info.pk = 'stacty_uid';
	data.push(data_info);
	var insert_output = insert_common(data);
	if(insert_output.result == 'success'){
		d_alert("저장이 완료되었습니다.");
		form.clear();
		dhxWindow.hide();
		select_account_type(function (type){
			type_parse(type);
		});
	}else{
		d_alert("저장하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
	}
}

//거래처 구분명 수정
async function update_type(value, stacty_uid){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_type';
	data_info.column = {
		'stacty_nm':value,
	};
	data_info.pk = 'stacty_uid';
	data_info.pk_value = [stacty_uid];
	data.push(data_info);
	var update_output = update_common(data);
	if(update_output.result == 'success'){
		return stacty_uid;
	}else{
		throw Error('update fail');
	}
}


/***************************************************** 거래처 구분 끝**************************************************************/
/***************************************************** 거래처 리스트 시작**************************************************************/
// 거래처 select
function select_account(uid = null, type = ''){
	if(uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account';
		data_info.column = '*';
		data_info.order = {'stac_uid':'desc'};
		if(uid != 'all'){ // 초기화면 거래처 전부 select 아닐경우 where 문 포함
			data_info.where = {and:[{column : 'stacty_uid', 'type' : '=', 'data' : uid}]};
		}
		data_array.push(data_info);
		var item_info = select_common(type, data_array);
		return item_info;
	}else{
		d_alert("거래처 리스트를 불러오지 못했습니다. 관리자에게 문의해 주세요.");
	}
}

//거래처 select 후 파싱 함수
function account_parse(loadData, stacty_nm, stacty_uid){
	const listGrid = new dhx.Grid("", {
		columns: [
			{ id: "stac_nm", header: [{ text: "거래처명" }, {content: "inputFilter"}]},
			{ id: "stac_tel", header: [{ text: "전화번호"}, {content: "inputFilter"}]},
			{ id: "stac_email", header: [{ text: "이메일"}, {content: "inputFilter"}]},
			{ id: "stac_fax", header: [{ text: "FAX번호"}], hidden : true},
			{ id: "stac_uid", header: [{ text: "거래처 고유번호"}], hidden : true},
			{ id: "stacty_uid", header: [{ text: "거래처 구분 고유번호"}], hidden : true},
			{ id: "stac_bsnregnum", header: [{ text: "사업자등록번호"}], hidden : true},
			{ id: "stac_corpregnum", header: [{ text: "법인등록번호"}], hidden : true},
			{ id: "stac_addr", header: [{ text: "사업장주소지"}], hidden : true},
			{ id: "stac_detailaddr", header: [{ text: "상세사업지주소"}], hidden : true},
			{ id: "stac_ceo", header: [{ text: "대표자명"}], hidden : true},
			{ id: "stac_desc", header: [{ text: "비고"}], hidden : true},
			{ id: "stac_memuid", header: [{ text: "등록자번호"}], hidden : true},
			{ id: "stac_regdate", header: [{ text: "등록일"}], hidden : true},
			{ id: "stac_email", header: [{ text: "이메일"}], hidden : true},
			{ id: "item", sortable: false, align: "center", header: [{text: "세부정보 등록", align: "center", colspan: 3}, { text: "품목", align: "center" }], width : 45, htmlEnable: true, template : () => "<div class='action-buttons'><a class='item'><i class='xi-sitemap xi-x'></i></a></div>"},
			{ id: "manager", sortable: false, align: "center", header: ["", { text: "담당자", align: "center" }], width : 60, htmlEnable: true, template : () => "<div class='action-buttons'><a class='manager'><i class='xi-user xi-x'></i></a></div>"},
			{ id: "sale", sortable: false, align: "center", header: ["", { text: "영업", align: "center", colspan: 2 }], width : 45, htmlEnable: true, template : () => "<div class='action-buttons'><a class='sale'><i class='xi-won xi-x'></i></a></div>"},
			{
				id: "option", sortable: false, header: [{ text: '<div style="width: 50px; height: 31px;"><i class="dxi dxi-plus"> </i><div>', align: "center" }],
				htmlEnable: true, align: "center",
				width:50,
				template: function () {
					return "<div class='action-buttons'><a class='remove-button-account'><i class='dxi dxi-minus'> </i></a></div>";
				}
			},
		],
		selection: true,
		autoWidth: true, 
		data: loadData.data.stnd_account,
	});

	layout.getCell("account_list").attach(listGrid);
	//Header '+' 거래처 추가
	listGrid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			if(stacty_nm && stacty_uid){
				account_window(stacty_nm, stacty_uid); //거래처 추가
			}else{
				d_alert('거래처 구분을 선택 후 진행해 주세요.');
			}
		}
	});
	listGrid.events.on("cellClick", function(row,column,e){
		var stac_uid = row.stac_uid;
		var stac_nm = row.stac_nm;
		if(column.id == 'item'){
			var item_data = select_account_item(stac_uid);
			account_item_window(item_data, stac_uid, stac_nm);
		}else if(column.id == 'manager'){
			var manager_data = select_account_manager(stac_uid);
			account_manager_window(manager_data, stac_uid, stac_nm);
		}else if(column.id == 'sale'){
			var sale_data = select_account_sale(stac_uid);
			account_sale_window(sale_data, stac_uid, stac_nm);
		}else if(column.id == 'stac_nm'){
			const account_data = listGrid.data.getItem(row.id);
			if(stacty_nm && stacty_uid){
				var type_uid = stacty_uid;
				var type_nm = stacty_nm;
				var focus_chk = 0;
			}else{
				var type_uid = account_data.stacty_uid;
				var select_type_nm = simple_select_type(type_uid);
				var type_nm = select_type_nm.data.stnd_account_type[0].stacty_nm;
				var focus_chk = 1;
			}
			var account_form = account_window(type_nm, type_uid, 'total');//거래처 form
			var item_data = select_account_item(stac_uid);
			var account_item_grid = account_item_window(item_data, stac_uid, stac_nm, 'total');//품목 grid
			var manager_data = select_account_manager(stac_uid);
			var account_manager_grid = account_manager_window(manager_data, stac_uid, stac_nm, 'total');//담당자 grid
			var sale_data = select_account_sale(stac_uid);
			var account_sale_grid = account_sale_window(sale_data, stac_uid, stac_nm, 'total');//영업 grid

			var account_formchk = account_total_window(focus_chk, stac_uid, stac_nm, account_form, account_item_grid, account_manager_grid, account_sale_grid); //거래처 상세보기 with TAB
			account_formchk.setValue(account_data);
		}else if(column.id == 'option'){
			d_confirm("거래처를 삭제하실 경우 해당 거래처의 품목, 담당자, 영업 정보가 함께 삭제됩니다. </br> 정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var item_chk = select_account_item(row.stac_uid);// 하위테이블 중 품목 삭제 전에 품목별 uid select
					var delete_chk = delete_account(row.stac_uid); //거래처 삭제
					if(delete_chk != 'fail'){//삭제완료시 거래처 품목 단가 삭제
						var item_list = item_chk.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item'];
						var stacit_arr = new Array();
						for(k = 0; k < item_list.length; k++){
							stacit_arr.push(item_list[k].stacit_uid);
						}
						var price_chk = del_account_item_rel('stacit_uid', stacit_arr);
						if(price_chk == 'fail'){
							return false;
						}						
						d_alert('거래처 삭제가 완료되었습니다.');
						var delete_id = listGrid.selection._selectedCells[0].row.id;
						listGrid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('거래처 삭제가 취소되었습니다.');
				}
			})

		}
	});
	
	const pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: listGrid.data,
		pageSize: 16
	});
	layout.getCell("pagination").attach(pagination);
}
//거래처 추가 Window창
function account_window(stacty_nm, stacty_uid, chk){
	if(chk == 'total'){
		var btn_nm = '수정';
	}else{
		var btn_nm = '저장';
	}
	const account_form = new dhx.Form("", {
		css: "dhx_widget--bordered",
		padding: 40,
		rows: [
			{
				name: "stacty_uid",
				type: "input",
				required: true,
				hidden: true,
				value: stacty_uid,
			},
			{
				name: "stacty_nm",
				type: "input",
				required: true,
				label: "거래처 구분",
				disabled: true,
				labelPosition: "left",
				labelWidth: 110,
				value: stacty_nm,
			},
			{
				name: "stac_nm",
				type: "input",
				label: "거래처 이름",
				labelPosition: "left",
				labelWidth: 110,
				required: true,
				placeholder: "거래처 명을 입력해 주세요.",
				errorMessage: "빈칸을 입력할 수 없습니다.",
			},
			{
				name: "stac_ceo",
				type: "input",
				label: "대표자",
				labelPosition: "left",
				labelWidth: 110,
				placeholder: "대표자 명을 입력해 주세요.",
			},
			{
				name: "stac_addr",
				type: "input",
				label: "주소",
				labelPosition: "left",
				labelWidth: 110,
				placeholder: "주소",
			},
			{
				name: "stac_detailaddr",
				type: "input",
				placeholder: "상세주소",
				labelPosition: "left",
				labelWidth: 110,
			},
			{
				name: "stac_tel",
				type: "input",
				label: "전화번호",
				labelPosition: "left",
				labelWidth: 110,
				placeholder: "전화번호",
				errorMessage: "'-' 없이 숫자만 입력해 주세요.",
				preMessage: "'-' 없이 숫자만 입력해 주세요.",
				validation: function(value) {
					return Number.isInteger(Number(value)) || value == '';
				},
			},
			{
				name: "stac_fax",
				type: "input",
				label: "팩스",
				labelPosition: "left",
				labelWidth: 110,
				placeholder: "FAX",
				errorMessage: "'-' 없이 숫자만 입력해 주세요.",
				preMessage: "'-' 없이 숫자만 입력해 주세요.",
				validation: function(value) {
					return Number.isInteger(Number(value)) || value == '';
				},
			},
			{
				name: "stac_email",
				type: "input",
				label: "Email",
				labelPosition: "left",
				labelWidth: 110,
				errorMessage: "email 형식을 바르게 입력해 주세요.",
				validation: function(value) {
					var reg_email = /^([0-9a-zA-Z_\.-]+)@([0-9a-zA-Z_-]+)(\.[0-9a-zA-Z_-]+){1,2}$/;
					return reg_email.test(value) || value == '';
				},
				placeholder: "abc@abc.com",
			},
			{
				name: "stac_bsnregnum",
				type: "input",
				label: "사업자등록번호",
				labelPosition: "left",
				labelWidth: 110,
			},
			{
				name: "stac_corpregnum",
				type: "input",
				label: "법인등록번호",
				labelPosition: "left",
				labelWidth: 110,
			},
			{
				name: "stac_desc",
				type: "textarea",
				label: "비고",
				labelPosition: "left",
				labelWidth: 110,
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: btn_nm,
						size: "medium",
						view: "flat",
						color: "primary",
						url: "./?json=ajax_for_dhtmlx_form",
					}
				]
			}
		]
	});
	if(chk == 'total'){
		return account_form;
	}

	const account_dhxWindow = new dhx.Window({
		width: '600',
		height: '840',
		title: "거래처",
		movable: true,
		closable: true,
	});
	account_dhxWindow.attach(account_form);
	account_dhxWindow.show();

	setTimeout(function(){
//		var width = 500; //팝업의 너비
//		var height = 600; //팝업의 높이
		$('input[name="stac_addr"]').click(function (){
			new daum.Postcode({
//				width: width,
//				height: height,
				oncomplete: function(data) {
					account_form.setValue({'stac_addr':data.address});
					account_form.setFocus('stac_detailaddr');
				}
			}).open({
				left: 1260,
				top: 150
//				left: (window.screen.width / 2) - (width / 2),
//				top: (window.screen.height / 2) - (height / 2)
			});
		});
	});

	account_form.events.on("change", function(name, value){
		if(name == "stac_email" || name == "stac_tel" || name == "stac_fax"){
			if(value == ''){
				account_form.getItem(name).clearValidate();
			}
		}
	});

	account_form.events.on("afterValidate", function(name, value){
		if(name == "stac_email" || name == "stac_tel" || name == "stac_fax"){
			if(value == ''){
				account_form.getItem(name).clearValidate();
			}
		}
	});

	account_form.events.on("AfterSend", function(){
		var formData = account_form.getValue();
		insert_account(formData, account_form, account_dhxWindow, stacty_nm, stacty_uid);
	});
}

//거래처 등록
function insert_account(formData, account_form, account_dhxWindow, stacty_nm, stacty_uid){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account';
	data_info.column = [
		{
			'stacty_uid':formData.stacty_uid,
			'stac_nm':formData.stac_nm,
			'stac_bsnregnum':formData.stac_bsnregnum,
			'stac_corpregnum':formData.stac_corpregnum,
			'stac_addr':formData.stac_addr,
			'stac_detailaddr':formData.stac_detailaddr,
			'stac_ceo':formData.stac_ceo,
			'stac_tel':formData.stac_tel,
			'stac_fax':formData.stac_fax,
			'stac_email':formData.stac_email,
			'stac_desc':formData.stac_desc,
			'stac_memuid':'',
			'stac_regdate':'',
		}
	];
	data_info.pk = 'stac_uid';
	data.push(data_info);
	var insert_output = insert_common(data);
	if(insert_output.result == 'success'){
		d_alert("저장이 완료되었습니다.");
		account_form.clear();
		account_dhxWindow.hide();
		var account_list = select_account(stacty_uid); // row 클릭시 오른쪽 레이아웃에 거래처 리스트 select
		account_parse(account_list, stacty_nm, stacty_uid) // parse
	}else{
		d_alert("저장하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
	}
}


/***************************************************** 품목 추가, 리스트 , 단가이력 시작**************************************************************/
//거래처별 품목리스트 select
function select_account_item(stac_uid){
	if(stac_uid != null){
		var type = '';
		var data_array = new Array();
		var data_info = new Object();
		var table = 'stnd_account_item';
		var join_table = '(select `stnd_account_price`.`stacpr_uid` AS `stacpr_uid`,`stnd_account_price`.`stacit_uid` AS `stacit_uid`,`stnd_account_price`.`stacpr_uprice` AS `stacpr_uprice`,`stnd_account_price`.`stacpr_tax` AS `stacpr_tax`,`stnd_account_price`.`stacpr_memuid` AS `stacpr_memuid`,`stnd_account_price`.`stacpr_regdate` AS `stacpr_regdate` from `stnd_account_price` where `stnd_account_price`.`stacpr_uid` in (select max(`stnd_account_price`.`stacpr_uid`) AS `stacpr_uid` from `stnd_account_price` group by `stnd_account_price`.`stacit_uid`)) AS stnd_account_price';
		var join_table2 = 'stnd_item';
		var pk = 'stacit_uid';
		data_info.table = [table,join_table,join_table2];
		data_info.column = '*';
		data_info.join = [{'stnd_account_item':'stacit_uid', 'stnd_account_price':'stacit_uid'},{'stnd_account_item':'stit_uid', 'stnd_item':'stit_uid'}];
		data_info.where = {and:[{column:'stac_uid',type:'=','data':stac_uid}]};
		data_info.order = {'stacpr_uid':'desc'};
		data_array.push(data_info);
		var loadData = select_common(type, data_array);
		return loadData;
	}else{
		d_alert('거래처 취급 품목 조회 중 오류가 발생하였습니다. 관리자에게 문의해주세요.');
		console.log('error : no uid');
		return false;
	}
}
//품목리스트 Window창
function account_item_window(item_data, stac_uid, stac_nm, chk){
	//LAYOUT
	var item_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		margin: 0,
		cols: [
			{
				type: "none",
				width: "96.5%",
				rows: [
					{
						id: "item_list",
						height:"93.3%",
					},
					{
						id: "item_pagination",
					},
				]
			}	
		]
	});

	const account_item_grid = new dhx.Grid("", {
		columns: [
			{ id: "stit_nm",width : 190, header: [{ text: "품목명" }, {content: "inputFilter"}]},
			{ id: "stacpr_uprice", header: [{ text: "단가" }], type : "number", format: "#,#"},
			{ id: "stacit_uid", header: [{ text: "거래처 품목 고유번호"}], hidden : true},
			{
				id: "price_record", sortable: false, header: [{ text: '단가 이력', align: "center" }],
				htmlEnable: true, align: "center",
				width:80,
				template: function (){
					return "<div class='action-buttons'><a class='stacpr_record'><i class='xi-list-square'> </i></a></div>";
				}
			},
			{ id: "stacpr_tax", header: [{ text: "세금 여부" }]},
			{
				id: "option", sortable: false, header: [{ text: '<div style="width: 50px; height: 31px;"><i class="dxi dxi-plus"> </i><div>', align: "center" }],
				htmlEnable: true, align: "center",
				width:50,
				template: function (){
					return "<div class='action-buttons'><a class='remove-button-type'><i class='dxi dxi-minus'> </i></a></div>";
				}
			},
		],
		selection: true,
		autoWidth: true, 
		data: item_data.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item'],
	});
	if(chk == 'total'){
		return account_item_grid;
	}
	//Header '+' 품목 추가
	account_item_grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			var item_select = select_item();
			item_more_window(item_select, stac_uid, stac_nm, function(callback_data){
				account_item_grid.data.parse(callback_data.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item']);
				account_item_grid.selection.setCell('', '');
			});
		}
	});
	account_item_grid.events.on("cellClick", function(row,column,e){
		if(column.id == 'option'){
			d_confirm("품목을 삭제하실 경우 해당 품목의 단가내역이 함께 삭제됩니다. </br> 정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var delete_chk = delete_account_item(row.stacit_uid); //품목삭제
					if(delete_chk != 'fail'){
						d_alert('거래처 취급 품목 삭제가 완료되었습니다.');
						var delete_id = account_item_grid.selection._selectedCells[0].row.id;
						account_item_grid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('품목 삭제가 취소되었습니다.');
				}
			})
		}else if(column.id == 'price_record'){
			var price_log = select_account_price(row.stacit_uid); //단가 변동 리스트
			account_price_window(price_log);
		}else if(column.id == 'stacpr_uprice'){
			var stit_uid = row.stit_uid;
			var stit_nm = row.stit_nm;
			var stacit_uid = row.stacit_uid;
			item_update_window(stit_uid, stit_nm, stac_uid, stac_nm, stacit_uid, function(callback_data){
				account_item_grid.data.parse(callback_data.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item']);
				account_item_grid.selection.setCell('', '');
			});
		}
	});

	const item_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_item_grid.data,
		pageSize: 15
	});
	item_layout.getCell("item_list").attach(account_item_grid);
	item_layout.getCell("item_pagination").attach(item_pagination);

	const account_item_dhxWindow = new dhx.Window({
		width: '600',
		height: '800',
		title: "품목 리스트",
		movable: true,
		closable: true,
	});
	account_item_dhxWindow.attach(item_layout);
	account_item_dhxWindow.show();
}

//품목 추가 Window창
function item_more_window(item_select, stac_uid, stac_nm, callback_item){
	const item_form = new dhx.Form("", {
		css: "dhx_widget--bordered",
		padding: 40,
		rows: [
			{
				name: "stac_uid",
				type: "input",
				required: true,
				hidden: true,
				value: stac_uid,
			},
			{
				name: "stac_nm",
				type: "input",
				required: true,
				label: "거래처명",
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: stac_nm,
			},
			{
				type: "combo",
				name: "stit_uid",
				label: "품목",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				placeholder: "품목을 선택 해 주세요.",
//				errorMessage: "품목이 선택되지 않았습니다.",
				data: item_select.data.stnd_item
			},
			{
				type: "input",
				name: "stacpr_uprice",
				required: true,
				label: "단가",
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "",
				validation: function(value) {
					return Number.isInteger(Number(value)) && value != '';
				},
			},
			{
				type: "select",
				name: "stacpr_tax",
				label: "세금 여부",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				options: [
					{
						value: "세금 포함",
						content: "세금 포함"
					},
					{
						value: "세금 별도",
						content: "세금 별도",
					}
				]
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: "저장",
						size: "medium",
						view: "flat",
						color: "primary",
						url: "./?json=ajax_for_dhtmlx_form",
					}
				]
			}
		]
	});
	const item_dhxWindow = new dhx.Window({
		left: 1270,
		top: 68,
		width: '500',
		height: '500',
		title: "취급 품목",
		movable: true,
		closable: true,
	});
	item_dhxWindow.attach(item_form);
	item_dhxWindow.show();

	item_form.events.on("beforeValidate", function(name, value){
		if(name == "stacpr_uprice"){
			if(value != ''){
				item_form.getItem(name).config.errorMessage = '올바른 형식이 아닙니다.'
			}else{
				item_form.getItem(name).config.errorMessage = '빈값을 입력할 수 없습니다.'
			}
		}
	});

	item_form.events.on("AfterSend", function(){
		var formData = item_form.getValue();
		var stacit_chk = select_stacit_chk(stac_uid, formData.stit_uid);
		if(Array.isArray(stacit_chk.data)){
			var insert_item = insert_account_item(formData); //품목 insert
			if(insert_item != 'fail'){
				var stacit_uid = insert_item.uid.stnd_account_item[0];
				var insert_price = insert_account_price(stacit_uid, formData); //품목단가 insert
				if(insert_price != 'fail'){
					d_alert("저장이 완료되었습니다.");
					item_form.clear();
					item_dhxWindow.hide();
					var item_data = select_account_item(stac_uid);
					callback_item(item_data);
				}
			}
		}else{
			d_alert('이미 등록된 품목입니다.');
		}
	});
}

//품목전체 select 
function select_item(){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_item';
	data_info.column = ['stit_uid AS id','stit_nm AS value'];
	data_info.order = {'stit_uid':'desc'};
	data_array.push(data_info);
	var item_info = select_common(type, data_array);
	return item_info;
}

//거래처별 신규 품목 등록 insert 함수
function insert_account_item(formData){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_item';
	data_info.column = [{'stac_uid':formData.stac_uid,'stit_uid':formData.stit_uid, 'stacit_memuid':'', 'stacit_regdate':''}];
	data_info.pk = 'stacit_uid';
	data.push(data_info);
	var insert_output = insert_common(data);
	if(insert_output.result == 'success'){
		return insert_output;
	}else{
		d_alert("저장하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
}

//거래처별 신규 품목 등록 insert 후 품목 해당 단가 insert 함수
function insert_account_price(uid, formData){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_price';
	data_info.column = [{'stacit_uid':uid,'stacpr_uprice':formData.stacpr_uprice,'stacpr_tax':formData.stacpr_tax,'stacpr_memuid':'', 'stacpr_regdate':''}];
	data_info.pk = 'stacpr_uid';
	data.push(data_info);
	var insert_output = insert_common(data);
	if(insert_output.result == 'success'){
		return insert_output;
	}else{
		d_alert("저장하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
}

//거래처별 등록된 품목 중복검사
function select_stacit_chk(stac_uid, stit_uid){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	var table = 'stnd_account_item';
	var pk = 'stacit_uid';
	data_info.table = table;
	data_info.column = '*';
	data_info.where = {and:[{column:'stac_uid',type:'=','data':stac_uid}, {column:'stit_uid',type:'=','data':stit_uid}]};
	data_array.push(data_info);
	var loadData = select_common(type, data_array);
	return loadData;
}

//품목 업데이트 Window창
function item_update_window(stit_uid, stit_nm, stac_uid, stac_nm, stacit_uid, callback_item){
	const item_update_form = new dhx.Form("", {
		css: "dhx_widget--bordered",
		padding: 40,
		rows: [
			{
				name: "stac_uid",
				type: "input",
				required: true,
				hidden: true,
				value: stac_uid,
			},
			{
				name: "stac_nm",
				type: "input",
				required: true,
				label: "거래처명",
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: stac_nm,
			},
			{
				name: "stit_uid",
				type: "input",
				required: true,
				hidden: true,
				value: stit_uid,
			},
			{
				type: "input",
				name: "stit_nm",
				label: "품목",
				required: true,
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: stit_nm,
			},
			{
				type: "input",
				name: "stacpr_uprice",
				label: "단가",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "",
				validation: function(value) {
					return Number.isInteger(Number(value)) && value != '';
				},
			},
			{
				type: "select",
				name: "stacpr_tax",
				label: "세금 여부",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				options: [
					{
						value: "세금 포함",
						content: "세금 포함"
					},
					{
						value: "세금 별도",
						content: "세금 별도",
					}
				]
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: "저장",
						size: "medium",
						view: "flat",
						color: "primary",
						url: "./?json=ajax_for_dhtmlx_form",
					}
				]
			}
		]
	});
	const item_update_dhxWindow = new dhx.Window({
		left: 1270,
		top: 68,
		width: '500',
		height: '500',
		title: "취급 품목",
		movable: true,
		closable: true,
	});
	item_update_dhxWindow.attach(item_update_form);
	item_update_dhxWindow.show();

	item_update_form.events.on("beforeValidate", function(name, value){
		if(name == "stacpr_uprice"){
			if(value != ''){
				item_update_form.getItem(name).config.errorMessage = '올바른 형식이 아닙니다.'
			}else{
				item_update_form.getItem(name).config.errorMessage = '빈값을 입력할 수 없습니다.'
			}
		}
	});


	item_update_form.events.on("AfterSend", function(){
		var update_formData = item_update_form.getValue();
		var insert_price = insert_account_price(stacit_uid, update_formData); //품목단가 update
		if(insert_price != 'fail'){
			d_alert("저장이 완료되었습니다.");
			item_update_form.clear();
			item_update_dhxWindow.hide();
			var item_data = select_account_item(stac_uid);
			callback_item(item_data);
		}
	});
}

//거래처 취급품목 단가이력 조회
function select_account_price(stacit_uid = null, type = ''){
	if(stacit_uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account_price';
		data_info.column = '*';
		data_info.order = {'stacpr_uid':'desc'};
		data_info.where = {and:[{column : 'stacit_uid', 'type' : '=', 'data' : stacit_uid}]};
		data_array.push(data_info);
		var item_info = select_common(type, data_array);
		return item_info;
	}else{
		d_alert('거래처 취급 품목 단가 조회 중 오류가 발생하였습니다. 관리자에게 문의해주세요.');
		console.log('error : no uid');
		return false;
	}
}

//단가변동 이력 window
function account_price_window(price_log){
	//LAYOUT
	var price_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		cols: [
			{
				type: "none",
				width: "95.5%",
				rows: [
					{
						id: "price_list",
					},
					{
						id: "price_pagination",
						height:"10%",
					},
				]
			}	
		]
	});
	const account_price_grid = new dhx.Grid("", {
		columns: [
			{ id: "stacpr_uprice", header: [{ text: "단가" }], type : "number", format: "#,#"},
			{ id: "stacpr_tax", header: [{ text: "세금 여부" }]},
			{ id: "stacpr_regdate", header: [{ text: "등록일" }, {content: "inputFilter"}], type : "text", format: "%M %d %Y"},
			{ id: "stacpr_uid", header: [{ text: "거래처 취급품목 단가 고유번호"}], hidden : true},
		],
		selection: true,
		autoWidth: true, 
		data: price_log.data.stnd_account_price,
	});

	const price_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_price_grid.data,
		pageSize: 15
	});
	price_layout.getCell("price_list").attach(account_price_grid);
	price_layout.getCell("price_pagination").attach(price_pagination);


	const account_price_dhxWindow = new dhx.Window({
		left: 1270,
		top: 69,
		width: '500',
		height: '590',
		title: "단가변동 이력",
		movable: true,
		closable: true,
	});
	account_price_dhxWindow.attach(price_layout);
	account_price_dhxWindow.show();
}
/***************************************************** 품목 추가, 리스트 , 단가이력 끝**************************************************************/
/***************************************************** 담당자 추가, 리스트 **************************************************************/
//거래처 별 담당자 조회 select
function select_account_manager(stac_uid = null, type = ''){
	if(stac_uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account_manager';
		data_info.column = '*';
		data_info.order = {'stacma_uid':'desc'};
		data_info.where = {and:[{column : 'stac_uid', 'type' : '=', 'data' : stac_uid}]};
		data_array.push(data_info);
		var item_info = select_common(type, data_array);
		return item_info;
	}else{
		d_alert('거래처 영업 담당자 조회 중 오류가 발생하였습니다. 관리자에게 문의해주세요.');
		console.log('error : no uid');
		return false;
	}
}

//담당자 조회 window
function account_manager_window(manager_data, stac_uid, stac_nm, chk){
	//LAYOUT
	var manager_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		margin: 0,
		cols: [
			{
				type: "none",
				width: "96.5%",
				rows: [
					{
						id: "manager_list",
						height:"100%",
					},
					/*
					{
						id: "item_pagination",
					},
					*/
				]
			}	
		]
	});
	const account_manager_grid = new dhx.Grid("", {
		columns: [
			{ id: "stacma_nm", header: [{ text: "담당자 이름" }, {content: "inputFilter"}]},
			{ id: "stacma_tel", header: [{ text: "전화번호" }, {content: "inputFilter"}]},
			{ id: "stacma_email", header: [{ text: "이메일" }]},
			{ id: "stacma_uid", header: [{ text: "거래처 담당자 고유번호"}], hidden : true},
			{ id: "stac_uid", header: [{ text: "거래처 고유번호"}], hidden : true},
			{
				id: "option", sortable: false, header: [{ text: '<div style="width: 50px; height: 31px;"><i class="dxi dxi-plus"> </i><div>', align: "center" }],
				htmlEnable: true, align: "center",
				width:50,
				template: function (){
					return "<div class='action-buttons'><a class='add-button-manager'><i class='dxi dxi-minus'> </i></a></div>";
				}
			},
		],
		selection: true,
		autoWidth: true, 
		data: manager_data.data['stnd_account_manager'],
	});
	if(chk == 'total'){
		return account_manager_grid;
	}
	//Header '+' 담당자 추가
	account_manager_grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			manager_more_window(stac_uid, stac_nm, '저장', function(callback_data){
				account_manager_grid.data.parse(callback_data.data['stnd_account_manager']);
			});
		}
	});
	account_manager_grid.events.on("cellClick", function(row,column,e){
		if(column.id == 'option'){
			d_confirm("정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var delete_chk = delete_account_manager(row.stacma_uid); //담당자삭제
					if(delete_chk != 'fail'){
						var delete_id = account_manager_grid.selection._selectedCells[0].row.id;
						account_manager_grid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('담당자 삭제가 취소되었습니다.');
				}
			})
		}else if(column.id == 'stacma_nm'){
			const item = account_manager_grid.data.getItem(row.id);
			var manager_uid = item.stacma_uid;
			var manager_form = manager_more_window(stac_uid, stac_nm, '수정', function(callback_data){
				account_manager_grid.data.parse(callback_data.data['stnd_account_manager']);
				account_manager_grid.selection.setCell('', '');
			}, manager_uid);
			manager_form.setValue(item);
		}
	});

	const manager_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_manager_grid.data,
		pageSize: 15
	});
	manager_layout.getCell("manager_list").attach(account_manager_grid);
//	manager_layout.getCell("manager_pagination").attach(manager_pagination);


	const account_manager_dhxWindow = new dhx.Window({
		width: '600',
		height: '800',
		title: "담당자 리스트",
		movable: true,
		closable: true,
	});
	account_manager_dhxWindow.attach(manager_layout);
	account_manager_dhxWindow.show();
}

//담당자 추가 insert, update
function manager_more_window(stac_uid, stac_nm, button_nm, callback_manager, manager_uid){
	const manager_insert_form = new dhx.Form("", {
		css: "dhx_widget--bordered",
		padding: 40,
		rows: [
			{
				name: "stac_uid",
				type: "input",
				required: true,
				hidden: true,
				value: stac_uid,
			},
			{
				name: "stac_nm",
				type: "input",
				required: true,
				label: "거래처명",
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: stac_nm,
			},
			{
				type: "input",
				name: "stacma_nm",
				label: "이름",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "빈칸을 입력할 수 없습니다.",
			},
			{
				type: "input",
				name: "stacma_tel",
				label: "전화번호",
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "'-' 없이 숫자만 입력해 주세요.",
				preMessage: "'-' 없이 숫자만 입력해 주세요.",
				validation: function(value) {
					return Number.isInteger(Number(value)) || value == '';
				},
			},
			{
				type: "input",
				name: "stacma_email",
				label: "Email",
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "email 형식을 바르게 입력해 주세요.",
				validation: function(value) {
					var reg_email = /^([0-9a-zA-Z_\.-]+)@([0-9a-zA-Z_-]+)(\.[0-9a-zA-Z_-]+){1,2}$/;
					return reg_email.test(value) || value == '';
				},
				placeholder: "abc@abc.com",
			},
			{
				type: "textarea",
				name: "stacma_desc",
				label: "비고",
				labelPosition: "left",
				labelWidth: 70,
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: button_nm,
						size: "medium",
						view: "flat",
						color: "primary",
						url: "./?json=ajax_for_dhtmlx_form",
					}
				]
			}
		]
	});
	const manager_insert_dhxWindow = new dhx.Window({
		left: 1270,
		top: 68,
		width: '500',
		height: '550',
		title: "담당자",
		movable: true,
		closable: true,
	});
	manager_insert_dhxWindow.attach(manager_insert_form);
	manager_insert_dhxWindow.show();

	manager_insert_form.events.on("change", function(name, value){
		if(name == "stacma_tel" || name == "stacma_email" && value == ''){
			manager_insert_form.getItem(name).clearValidate();
		}
	});

	manager_insert_form.events.on("afterValidate", function(name, value){
		if(name == "stacma_tel" || name == "stacma_email" && value == ''){
			manager_insert_form.getItem(name).clearValidate();
		}
	});

	manager_insert_form.events.on("AfterSend", function(){
		var formData = manager_insert_form.getValue();
		if(manager_insert_form.config.rows[6].cols[0].text == '저장'){
			var insert_manager = insert_account_manager(formData); //거래처 담당자 insert
			if(insert_manager != 'fail'){
				manager_insert_form.clear();
				manager_insert_dhxWindow.hide();
				var manager_data = select_account_manager(stac_uid);
				callback_manager(manager_data);
			}
		}else{
			var update_manager = update_account_manager(formData, manager_uid); //거래처 담당자 update
			if(update_manager != 'fail'){
				manager_insert_form.clear();
				manager_insert_dhxWindow.hide();
				var manager_data = select_account_manager(stac_uid);
				callback_manager(manager_data);
			}
		}
	});
	return manager_insert_form;
}

//거래처 담당자 insert
function insert_account_manager(formData){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_manager';
	data_info.column = [
		{
			'stac_uid':formData.stac_uid,
			'stacma_nm':formData.stacma_nm,
			'stacma_tel':formData.stacma_tel,
			'stacma_email':formData.stacma_email,
			'stacma_desc':formData.stacma_desc,
			'stacma_memuid':'',
			'stacma_regdate':'',
		}
	];
	data_info.pk = 'stacma_uid';
	data.push(data_info);
	var insert_output = insert_common(data);
	if(insert_output.result == 'success'){
		d_alert("저장이 완료되었습니다.");
	}else{
		d_alert("저장하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
}

//거래처 담당자 update
function update_account_manager(formData, manager_uid){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_manager';
	data_info.column = {
		'stac_uid':formData.stac_uid,
		'stacma_nm':formData.stacma_nm,
		'stacma_tel':formData.stacma_tel,
		'stacma_email':formData.stacma_email,
		'stacma_desc':formData.stacma_desc,
	};
	data_info.pk = 'stacma_uid';
	data_info.pk_value = [manager_uid];
	data.push(data_info);
	var update_output = update_common(data);
	if(update_output.result == 'success'){
		d_alert("수정이 완료되었습니다.");
	}else{
		d_alert("수정하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
}

/***************************************************** 담당자 추가, 리스트 끝**************************************************************/
/***************************************************** 영업 추가, 리스트 시작**************************************************************/

//거래처별 영업정보 select
function select_account_sale(stac_uid = null, type = ''){
	if(stac_uid != null){
		var data_array = new Array();
		var data_info = new Object();
		var table = 'stnd_account_sale'
		var join_table = 'stnd_member';
		data_info.table = [table,join_table];
		data_info.column = '*';
		data_info.join = {'stnd_account_sale':'stme_uid', 'stnd_member':'stme_uid'};
		data_info.order = {'stnd_account_sale.stacsa_uid':'desc'};
		data_info.where = {and:[{column : 'stnd_account_sale.stac_uid', 'type' : '=', 'data' : stac_uid}]};
		data_array.push(data_info);
		var item_info = select_common(type, data_array);
		return item_info;
	}else{
		d_alert('거래처 영업 내역 조회 중 오류가 발생하였습니다. 관리자에게 문의해주세요.');
		console.log('error : no uid');
		return false;
	}
}

//거래처별 영업정보 리스트 window
function account_sale_window(sale_data, stac_uid, stac_nm, chk){
	//LAYOUT
	var sale_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		cols: [
			{
				type: "none",
				width: "96.5%",
				rows: [
					{
						id: "sale_list",
						height:"93.3%",
					},
					{
						id: "sale_pagination",
					},
				]
			}	
		]
	});

	const account_sale_grid = new dhx.Grid("", {
		columns: [
			{ id: "stacsa_title", header: [{ text: "영업 제목" }, {content: "inputFilter"}]},
			{ id: "stacsa_date", header: [{ text: "영업일자" }, {content: "inputFilter"}]},
			{ id: "stme_nm", header: [{ text: "영업사원" }, {content: "inputFilter"}]},
			{ id: "stacsa_uid", header: [{ text: "거래처 영업 고유번호"}], hidden : true},
			{ id: "stac_uid", header: [{ text: "거래처 고유번호"}], hidden : true},
			{ id: "stme_uid", header: [{ text: "영업사원 고유번호" }], hidden : true},
			{ id: "file_uid", header: [{ text: "파일 고유번호" }], hidden : true},
			{ id: "stacsa_content", header: [{ text: "영업 내용" }], hidden : true},
			{ id: "stacsa_memuid", header: [{ text: "등록자" }], hidden : true},
			{ id: "stacsa_regdate", header: [{ text: "등록일" }], hidden : true},
			{
				id: "option", sortable: false, header: [{ text: '<div style="width: 50px; height: 31px;"><i class="dxi dxi-plus"> </i><div>', align: "center" }],
				htmlEnable: true, align: "center",
				width:50,
				template: function (){
					return "<div class='action-buttons'><a class='delete-button-sale'><i class='dxi dxi-minus'> </i></a></div>";
				}
			},
		],
		selection: true,
		autoWidth: true, 
		data: sale_data.data['stnd_account_sale join stnd_member'],
	});
	if(chk == 'total'){
		return account_sale_grid;
	}
	//Header '+' 영업 추가
	account_sale_grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			var member_select = select_member();
			sale_more_window(member_select, stac_uid, stac_nm, '저장', function(callback_data){
				account_sale_grid.data.parse(callback_data.data['stnd_account_sale join stnd_member']);
			});
		}
	});

	//영업제목 클릭 시 영업 상세보기&수정
	account_sale_grid.events.on("cellClick", function(row,column,e){
		if(column.id == 'option'){
			d_confirm("정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var delete_chk = delete_account_sale(row.stacsa_uid); //영업삭제
					if(delete_chk != 'fail'){
						var delete_id = account_sale_grid.selection._selectedCells[0].row.id;
						account_sale_grid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('영업 삭제가 취소되었습니다.');
				}
			})
		}else if(column.id == 'stacsa_title'){
			var member_select = select_member();
			const sale_item = account_sale_grid.data.getItem(row.id);
			var sale_uid = sale_item.stacsa_uid;
			var sale_form = sale_more_window(member_select, stac_uid, stac_nm, '수정', function(callback_data){
				account_sale_grid.data.parse(callback_data.data['stnd_account_sale join stnd_member']);
				account_sale_grid.selection.setCell('', '');
			}, sale_uid);
			sale_form.setValue(sale_item);
		}
	});

	const sale_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_sale_grid.data,
		pageSize: 15
	});
	sale_layout.getCell("sale_list").attach(account_sale_grid);
	sale_layout.getCell("sale_pagination").attach(sale_pagination);

	const account_sale_dhxWindow = new dhx.Window({
		width: '600',
		height: '800',
		title: "영업 리스트",
		movable: true,
		closable: true,
	});
	account_sale_dhxWindow.attach(sale_layout);
	account_sale_dhxWindow.show();
}

//영업사원 select for selectBox
function select_member(){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_member';
	data_info.column = ['stme_uid AS id','stme_nm AS value'];
	data_info.order = {'stme_uid':'desc'};
	data_array.push(data_info);
	var member_info = select_common(type, data_array);
	return member_info;
}

//영업등록 insert & update
function sale_more_window(member_select, stac_uid, stac_nm, button_nm, callback_sale, sale_uid){
	const sale_insert_form = new dhx.Form("", {
		css: "dhx_widget--bordered",
		padding: 40,
		rows: [
			{
				name: "stac_uid",
				type: "input",
				required: true,
				hidden: true,
				value: stac_uid,
			},
			{
				name: "stac_nm",
				type: "input",
				required: true,
				label: "거래처명",
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: stac_nm,
			},
			{
				type: "input",
				name: "stacsa_title",
				label: "제목",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "빈칸을 입력할 수 없습니다.",
			},
			{
				type: "combo",
				name: "stme_uid",
				label: "영업사원",
				required: true,
				placeholder: "사원을 선택 해 주세요.",
				labelPosition: "left",
				labelWidth: 70,
				data: member_select.data.stnd_member
			},
			{
				type: "datepicker",
				name: "stacsa_date",
				label: "영업일자",
				required: true,
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "날짜가 선택되지 않았습니다.",
			},
			{
				type: "textarea",
				name: "stacsa_content",
				label: "내용",
				labelPosition: "left",
				labelWidth: 70,
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: button_nm,
						size: "medium",
						view: "flat",
						color: "primary",
						url: "./?json=ajax_for_dhtmlx_form",
					}
				]
			}
		]
	});
	const sale_insert_dhxWindow = new dhx.Window({
		left: 1270,
		top: 68,
		width: '500',
		height: '560',
		title: "영업",
		movable: true,
		closable: true,
	});
	sale_insert_dhxWindow.attach(sale_insert_form);
	sale_insert_dhxWindow.show();

	sale_insert_form.events.on("AfterSend", function(){
		var formData = sale_insert_form.getValue();
		if(sale_insert_form.config.rows[6].cols[0].text == '저장'){
			var insert_sale = insert_account_sale(formData); //거래처 영업 insert
			if(insert_sale != 'fail'){
				sale_insert_form.clear();
				sale_insert_dhxWindow.hide();
				var sale_data = select_account_sale(stac_uid);
				callback_sale(sale_data);
			}
		}else{
			var update_sale = update_account_sale(formData, sale_uid); //거래처 영업 update
			if(update_sale != 'fail'){
				sale_insert_form.clear();
				sale_insert_dhxWindow.hide();
				var sale_data = select_account_sale(stac_uid);
				callback_sale(sale_data);
			}
		}
	});
	return sale_insert_form;
}

//거래처 영업 insert
function insert_account_sale(formData){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_sale';
	data_info.column = [
		{
			'stac_uid':formData.stac_uid,
			'stme_uid':formData.stme_uid,
			'stacsa_content':formData.stacsa_content,
			'stacsa_date':formData.stacsa_date,
			'stacsa_title':formData.stacsa_title,
			'stacsa_memuid':'',
			'stacsa_regdate':'',
		}
	];
	data_info.pk = 'stacsa_uid';
	data.push(data_info);
	var insert_output = insert_common(data);
	if(insert_output.result == 'success'){
		d_alert("저장이 완료되었습니다.");
	}else{
		d_alert("저장하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
}

//거래처 영업 update
function update_account_sale(formData, sale_uid){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_sale';
	data_info.column = {
		'stac_uid':formData.stac_uid,
		'stme_uid':formData.stme_uid,
		'stacsa_content':formData.stacsa_content,
		'stacsa_date':formData.stacsa_date,
		'stacsa_title':formData.stacsa_title,
	};
	data_info.pk = 'stacsa_uid';
	data_info.pk_value = [sale_uid];
	data.push(data_info);
	var update_output = update_common(data);
	if(update_output.result == 'success'){
		d_alert("수정이 완료되었습니다.");
	}else{
		d_alert("수정하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
};
/***************************************************** 영업 추가, 리스트 끝**************************************************************/
/***************************************************** 거래처,품목,담당자,영업 통합상세보기 및 수정 시작*****************************************************/
//거래처 통합상세보기 Window창
function account_total_window(focus_chk, stac_uid, stac_nm, account_form, account_item_grid, account_manager_grid, account_sale_grid){
	const account_total_dhxWindow = new dhx.Window({
		width: '600',
		height: '900',
		left: '950',
		top: '10',
		title: "거래처 상세보기",
		movable: true,
		closable: true,
	    modal:true
	});
	const tabbar = new dhx.Tabbar("", {
		mode: "top",
		activeTab: "account_tab",
		css: "dhx_widget--bordered",
		views: [
			{ tab: "거래처", id: "account_tab" },
			{ tab: "품목", id: "item_tab" },
			{ tab: "담당자", id: "manager_tab" },
			{ tab: "영업", id: "sale_tab" }
		]
	});

//////////////////////////////////////////////////////품목탭 함수/////////////////////////////////////////////////
	//LAYOUT
	var item_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		margin: 0,
		cols: [
			{
				type: "none",
				width: "96.5%",
				rows: [
					{
						id: "item_list",
						height:"93.7%",
					},
					{
						id: "item_pagination",
					},
				]
			}	
		]
	});

	//Header '+' 품목 추가
	account_item_grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			var item_select = select_item();
			item_more_window(item_select, stac_uid, stac_nm, function(callback_data){
				account_item_grid.data.parse(callback_data.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item']);
				account_item_grid.selection.setCell('', '');
			});
		}
	});
	account_item_grid.events.on("cellClick", function(row,column,e){
		if(column.id == 'option'){
			d_confirm("품목을 삭제하실 경우 해당 품목의 단가내역이 함께 삭제됩니다. </br> 정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var delete_chk = delete_account_item(row.stacit_uid); //품목삭제
					if(delete_chk != 'fail'){
						d_alert('거래처 취급 품목 삭제가 완료되었습니다.');
						var delete_id = account_item_grid.selection._selectedCells[0].row.id;
						account_item_grid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('품목 삭제가 취소되었습니다.');
				}
			})
		}else if(column.id == 'price_record'){
			var price_log = select_account_price(row.stacit_uid); //단가 변동 리스트
			account_price_window(price_log);
		}else if(column.id == 'stacpr_uprice'){
			var stit_uid = row.stit_uid;
			var stit_nm = row.stit_nm;
			var stacit_uid = row.stacit_uid;
			item_update_window(stit_uid, stit_nm, stac_uid, stac_nm, stacit_uid, function(callback_data){
				account_item_grid.data.parse(callback_data.data['stnd_account_item join (select stnd_account_price.stacpr_uid AS stacpr_uid,stnd_account_price.stacit_uid AS stacit_uid,stnd_account_price.stacpr_uprice AS stacpr_uprice,stnd_account_price.stacpr_tax AS stacpr_tax,stnd_account_price.stacpr_memuid AS stacpr_memuid,stnd_account_price.stacpr_regdate AS stacpr_regdate from stnd_account_price where stnd_account_price.stacpr_uid in (select max(stnd_account_price.stacpr_uid) AS stacpr_uid from stnd_account_price group by stnd_account_price.stacit_uid)) AS stnd_account_price join stnd_item']);
				account_item_grid.selection.setCell('', '');
			});
		}
	});
	const item_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_item_grid.data,
		pageSize: 15
	});
	item_layout.getCell("item_list").attach(account_item_grid);
	item_layout.getCell("item_pagination").attach(item_pagination);

//////////////////////////////////////////////////////담당자탭 함수/////////////////////////////////////////////////
	//LAYOUT
	var manager_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		margin: 0,
		cols: [
			{
				type: "none",
				width: "96.5%",
				rows: [
					{
						id: "manager_list",
						height:"100%",
					},
					/*
					{
						id: "item_pagination",
					},
					*/
				]
			}	
		]
	});

	//Header '+' 담당자 추가
	account_manager_grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			manager_more_window(stac_uid, stac_nm, '저장', function(callback_data){
				account_manager_grid.data.parse(callback_data.data['stnd_account_manager']);
				account_manager_grid.selection.setCell('', '');
			});
		}
	});
	account_manager_grid.events.on("cellClick", function(row,column,e){
		if(column.id == 'option'){
			d_confirm("정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var delete_chk = delete_account_manager(row.stacma_uid); //담당자삭제
					if(delete_chk != 'fail'){
						var delete_id = account_manager_grid.selection._selectedCells[0].row.id;
						account_manager_grid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('담당자 삭제가 취소되었습니다.');
				}
			})
		}else if(column.id == 'stacma_nm'){
			const item = account_manager_grid.data.getItem(row.id);
			var manager_uid = item.stacma_uid;
			var manager_form = manager_more_window(stac_uid, stac_nm, '수정', function(callback_data){
				account_manager_grid.data.parse(callback_data.data['stnd_account_manager']);
				account_manager_grid.selection.setCell('', '');
			}, manager_uid);
			manager_form.setValue(item);
		}
	});
	const manager_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_manager_grid.data,
		pageSize: 15
	});
	manager_layout.getCell("manager_list").attach(account_manager_grid);
//////////////////////////////////////////////////////영업탭 함수/////////////////////////////////////////////////
	//LAYOUT
	var sale_layout = new dhx.Layout("", { //LAYOUT
		type: "space",
		cols: [
			{
				type: "none",
				width: "96.5%",
				rows: [
					{
						id: "sale_list",
						height:"93.7%",
					},
					{
						id: "sale_pagination",
					},
				]
			}	
		]
	});
	//Header '+' 영업 추가
	account_sale_grid.events.on("HeaderCellClick", function(column,e){
		if(column.id == 'option'){
			var member_select = select_member();
			sale_more_window(member_select, stac_uid, stac_nm, '저장', function(callback_data){
				account_sale_grid.data.parse(callback_data.data['stnd_account_sale join stnd_member']);
				account_sale_grid.selection.setCell('', '');
			});
		}
	});

	//영업제목 클릭 시 영업 상세보기&수정
	account_sale_grid.events.on("cellClick", function(row,column,e){
		if(column.id == 'option'){
			d_confirm("정말로 삭제하시겠습니까?", function(chk){
				if(chk == true){
					var delete_chk = delete_account_sale(row.stacsa_uid); //영업삭제
					if(delete_chk != 'fail'){
						var delete_id = account_sale_grid.selection._selectedCells[0].row.id;
						account_sale_grid.data.remove(delete_id); //row 삭제
					}
				}else{
					d_alert('영업 삭제가 취소되었습니다.');
				}
			})
		}else if(column.id == 'stacsa_title'){
			var member_select = select_member();
			var empty_obj = {value : '', content:''};
			member_select.data.stnd_member.unshift(empty_obj);
			const sale_item = account_sale_grid.data.getItem(row.id);
			var sale_uid = sale_item.stacsa_uid;
			var sale_form = sale_more_window(member_select, stac_uid, stac_nm, '수정', function(callback_data){
				account_sale_grid.data.parse(callback_data.data['stnd_account_sale join stnd_member']);
				account_sale_grid.selection.setCell('', '');
			}, sale_uid);
			sale_form.setValue(sale_item);
		}
	});

	const sale_pagination = new dhx.Pagination("", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: account_sale_grid.data,
		pageSize: 15
	});
	sale_layout.getCell("sale_list").attach(account_sale_grid);
	sale_layout.getCell("sale_pagination").attach(sale_pagination);
//////////////////////////////////////////////////////tab 할당 -> WINDOW 창 생성/////////////////////////////////////////////////
	tabbar.getCell("account_tab").attach(account_form);
	tabbar.getCell("item_tab").attach(item_layout);
	tabbar.getCell("manager_tab").attach(manager_layout);
	tabbar.getCell("sale_tab").attach(sale_layout);
	account_total_dhxWindow.attach(tabbar);
	account_total_dhxWindow.show();
////////////////////////////////////////////////////// 거래처 수정 후 form return /////////////////////////////////////////////////

	account_form.events.on("change", function(name, value){
		if(name == "stac_email" || name == "stac_tel" || name == "stac_fax"){
			if(value == ''){
				account_form.getItem(name).clearValidate();
			}
		}
	});

	account_form.events.on("afterValidate", function(name, value){
		if(name == "stac_email" || name == "stac_tel" || name == "stac_fax"){
			if(value == ''){
				account_form.getItem(name).clearValidate();
			}
		}
	});

	account_form.events.on("AfterSend", function(){ //거래처 수정
		var formData = account_form.getValue();
		var update_chk = update_account(formData, stac_uid);
		if(update_chk != 'fail'){
			account_form.clear();
			account_total_dhxWindow.hide();
			if(focus_chk == 1){
				var account_list = select_account('all'); // 초기화면 select all
				account_parse(account_list) // parse
			}else{
				var account_list = select_account(formData.stacty_uid); // row 클릭시 오른쪽 레이아웃에 거래처 리스트 select
				account_parse(account_list, formData.stacty_nm, formData.stacty_uid) // parse
			}
		}
	});
	return account_form;
}

//거래처 구분 선택 없이 상세보기 누를경우 거래처 구분 select
function simple_select_type(type_uid){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account_type';
	data_info.column = ['stacty_nm'];
	data_info.where = {and:[{column : 'stacty_uid', 'type' : '=', 'data' : type_uid}]};
	data_array.push(data_info);
	var name_info = select_common(type, data_array);
	return name_info;
}

//거래처 상세보기창 수정
function update_account(formData, stac_uid){
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_account';
	data_info.column = {
		'stacty_uid':formData.stacty_uid,
		'stac_nm':formData.stac_nm,
		'stac_bsnregnum':formData.stac_bsnregnum,
		'stac_corpregnum':formData.stac_corpregnum,
		'stac_addr':formData.stac_addr,
		'stac_detailaddr':formData.stac_detailaddr,
		'stac_ceo':formData.stac_ceo,
		'stac_tel':formData.stac_tel,
		'stac_fax':formData.stac_fax,
		'stac_email':formData.stac_email,
		'stac_desc':formData.stac_desc,
	};
	data_info.pk = 'stac_uid';
	data_info.pk_value = [stac_uid];
	data.push(data_info);
	var update_output = update_common(data);
	if(update_output.result == 'success'){
		d_alert("수정이 완료되었습니다.");
	}else{
		d_alert("수정하는 과정에 문제가 발생하였습니다. 관리자에게 문의 해 주세요.");
		return 'fail';
	}
}

/***************************************************** 거래처,품목,담당자,영업 통합상세보기 및 수정 끝*****************************************************/
// 거래처 취급 품목 삭제 (거래처 취급 품목 단가 삭제)
function delete_account_item(uid = null, type = ''){
	if(uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account_item';
		data_info.column = 'stacit_uid';
		data_info.column_value = [uid];
		data_array.push(data_info);
		var del_info = delete_common(data_array);
		if(del_info.result == 'success'){
			var del_account_rel_arr = del_account_item_rel(data_info.column, data_info.column_value);
			if(Array.isArray(del_account_rel_arr)){
				del_info.rel_del_info = del_account_rel_arr;
			}
		}else {
			d_alert('거래처 취급 품목 삭제에 실패하였습니다. 관리자에게 문의주세요.');
			console.log('error : delete fail');
			return 'fail';
		}
		return del_info;
	}else{
		d_alert('거래처 취급 품목 삭제에 실패하였습니다. 관리자에게 문의주세요.');
		console.log('error : no uid');
		return 'fail';
	}
}

// 거래처 취급 품목 삭제 완료시 단가 삭제
function del_account_item_rel(col, id){
	var rel_del_info = [];
	var rel_info_table = 'stnd_account_price';
	var rel_del_array = [];
	rel_del_array.push({'table':rel_info_table,'column':col,'column_value':id});
	var rel_del_chk = delete_common(rel_del_array);
	if(rel_del_chk['result'] != 'success'){
		d_alert('거래처 취급품목 단가 관련 데이터 삭제에 실패하였습니다. 관리자에게 문의주세요.');
		return 'fail';
	}else{
		rel_del_info.push(rel_del_chk);
		return rel_del_info;
	}
}


// 거래처 담당자 삭제
function delete_account_manager(uid = null, type = ''){
	if(uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account_manager';
		data_info.column = 'stacma_uid';
		data_info.column_value = [uid];
		data_array.push(data_info);
		var del_info = delete_common(data_array);
		if(del_info.result == 'success'){
			d_alert('거래처 담당자 삭제가 완료되었습니다.');
		}else {
			d_alert('거래처 담당자 삭제에 실패하였습니다. 관리자에게 문의주세요.');
			console.log('error : delete fail');
			return 'fail';
		}
		return del_info;
	}else{
		alert('거래처 담당자 삭제에 실패하였습니다. 관리자에게 문의주세요.');
		console.log('error : no uid');
		return false;
	}
}

// 거래처 영업 삭제
function delete_account_sale(uid = null, type = ''){
	if(uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account_sale';
		data_info.column = 'stacsa_uid';
		data_info.column_value = [uid];
		data_array.push(data_info);
		var del_info = delete_common(data_array);
		if(del_info.result == 'success'){
			d_alert('거래처 영업 삭제가 완료되었습니다.');
		}else {
			d_alert('거래처 영업 삭제에 실패하였습니다. 관리자에게 문의주세요.');
			console.log('error : delete fail');
			return 'fail';
		}
		return del_info;
	}else{
		alert('거래처 영업 삭제에 실패하였습니다. 관리자에게 문의주세요.');
		console.log('error : no uid');
		return false;
	}
}

// 거래처 삭제 (거래처 삭제시 해당 거래처 취급 품목, 영업내역, 담당자 삭제)
function delete_account(uid = null, type = ''){
	if(uid != null){
		var data_array = new Array();
		var data_info = new Object();
		data_info.table = 'stnd_account';
		data_info.column = 'stac_uid';
		data_info.column_value = [uid];
		data_array.push(data_info);
		var del_info = delete_common(data_array);
		if(del_info.result == 'success'){
			var del_account_rel_arr = del_account_rel(data_info.column, data_info.column_value);
			if(Array.isArray(del_account_rel_arr)){
				del_info.rel_del_info = del_account_rel_arr;
			}
		}else {
			alert('거래처 삭제에 실패하였습니다. 관리자에게 문의주세요.');
			console.log('error : delete fail');
			return 'fail';
		}
		return del_info;
	}else{
		alert('거래처 삭제에 실패하였습니다. 관리자에게 문의주세요.');
		console.log('error : no uid');
		return 'fail';
	}
}

// 거래처 삭제 완료시 관련 품목, 영업, 담당자 삭제
function del_account_rel(col, id){
	var rel_del_info = [];
	var rel_info_table = ['stnd_account_item','stnd_account_sale','stnd_account_manager'];
	for(var del_i = 0; del_i < rel_info_table.length; del_i++){
		var rel_del_array = [];
		rel_del_array.push({'table':rel_info_table[del_i],'column':col,'column_value':id});
		rel_del_info.push(delete_common(rel_del_array));
		if(rel_del_info[del_i]['result'] != 'success'){
			alert('거래처 관련 데이터 삭제에 실패하였습니다. 관리자에게 문의주세요.');
			return 'fail';
		}
	}
	return rel_del_info;
}