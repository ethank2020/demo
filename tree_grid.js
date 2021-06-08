/*
	##### 업데이트로그 #####
	20210601 김현중 신규
*/

/***************************** 온로드 시작 *********************************/
$(function(){
	if(latest_ver != null){
		for(v = 1; v <= latest_ver; v++){	//버전 셀렉트 실행 (최신버전부터 역순으로 for문)
			var ver_obj = new Object();
			ver_obj.value = v;
			ver_obj.content = v;
			rows[0].options.push(ver_obj);
		}
		const form = new dhx.Form('form', {
			css: 'dhx_widget--border-shadow',
			padding: 40,
			margin : 50,
			top : 30, 
			width: 500,
			rows
		});
	var value = form.getItem('select').getValue();
	var load_data = call_data('tree_grid','trgr_id AS id, trgr_pid as parent, trgr_nm, trgr_col1, trgr_col2, trgr_memuid, CAST(trgr_regdate AS DATE)','trgr_ver','=',value);
	var data_box = load_data.data.tree_grid
	for(i = 0; i < data_box.length; i++){ //parent값이 99999면 객체값 날리기
		var pid_chk = data_box[i].parent;
		if(pid_chk == '99999'){
			delete data_box[i].parent;
		}
	}
	dataset = data_box;
	}
	//트리그리드 실행
	treegrid.data.parse(dataset);

	//트리구조 collapse 초기화 (접고 시작)
	collapseAll();

	//페이징
	const pagination = new dhx.Pagination("pagination", {
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: treegrid.data,
		pageSize: 10
	});
});
/***************************** 온로드 끝 *********************************/

//데이터셋 불러오기용 select_common
function call_data(ta, col, wh_name, wh_type, wh_data){
	var type = '';
	var data_array = new Array();
	var data_info = new Object(); 
	data_info.table = ta;
	data_info.column = [col];
	data_info.where = {and:[{column:wh_name,type:wh_type,'data':wh_data}]};
	data_info.order = {'trgr_uid':'asc'};
	data_array.push(data_info);
	var loadData = select_common(type, data_array);
	return loadData;
}

var dataset = []; //그리드박스용 빈값 데이터 (버전 없을경우 빈데이터)

//트리그리드 박스 구조
var treegrid = new dhx.TreeGrid('treegrid_container', {
	columns: [
		{id: 'trgr_nm', header: [{ text: 'Name' }, { content: "selectFilter" }] },
		{id: 'trgr_col1', header: [{ text: 'Column1' }, {content: "inputFilter" }] },
		{id: 'trgr_col2', header: [{ text: 'Column2' }, {content: "inputFilter" }] },
		{id: 'trgr_memuid', header: [{ text: 'Member' }] },
		{id: 'trgr_regdate', header: [{ text: 'Regdate' }] },
		{
			width : 140, id: "action", header: [{ text: "Row", align: "center" }],
			htmlEnable: true, align: "center",
			template: function () {
				return "<button class='add_buttons'><i class='xi-plus-min'></i></button><button class='delete_buttons'><i class='xi-minus-min'></i></button> "
			}
		}
	],
    editable: true,
	selection: 'complex',
	dragItem: 'column',
    autoWidth: true,
	data: dataset,
	eventHandlers: {
		onclick: {
			"add_buttons": function (e, data) {
				addChildSpan(data);
			},
			"delete_buttons": function (e, data) {
				deleteSpan(data);
			}
		}
	}
});

//행 삭제 기능
function deleteSpan(data){
	var row_id = data.row.id;
    if (row_id) {
        treegrid.data.remove(row_id);
    }
};

//부모행 추가 기능 (빈값으로 행추가)
function addSpan(){
	var data_obj = new Object();
	data_obj = {'trgr_nm': '', 'trgr_col1': '', 'trgr_col2': '', 'trgr_memuid': '','trgr_regdate': ''};
	treegrid.data.add(data_obj);
}

//자식행 추가 (행 선택 후 선택된 행에 자식행 추가)
function addChildSpan(data){
	var data_obj = new Object();
	var row_id = data.row.id;
	data_obj = {'parent': row_id, 'trgr_nm': '', 'trgr_col1': '', 'trgr_col2': '', 'trgr_memuid': '','trgr_regdate': ''}
	treegrid.data.add(data_obj);
}

//데이터 저장
function save_data(time){
	if(login_uid == 'not_login'){
		alert('사용자 정보를 찾을 수 없습니다.');	
		return false;
	};
	var updatetime = time;
	//저장시 데이터 현재상태 -> 저장 or 업데이트용 
	var state = treegrid.data.serialize();
	console.log(state);
	var version = 1; //버전 없을경우 버전1
	if(latest_ver != null){ //버전있을경우 최신버전+1로 저장
		version = Number(latest_ver)+1;
	}
	var chk_obj = new Object(); //부모자식 uid체크용 객체 (for문 돌리면서 {구분값id : row번호} 식으로 추가)
	//데이터 저장 시작
	var data = new Array();
	var data_info = new Object();
	data_info.table = 'tree_grid';
	data_info.pk = 'trgr_uid';
	data_info.column = [];
	for(s=0; s < state.length; s++){
		var col_info = new Object();
		if(state[s].parent == 'treegrid_container'){ //부모일 경우
			console.log('부모');
			var chk_id = s;
			var nm = state[s].trgr_nm;
			var col1 = state[s].trgr_col1;
			var col2 = state[s].trgr_col2;
			var memuid = login_uid;
			var regdate = updatetime;
			chk_obj[state[s].id] = chk_id;
			col_info = {'trgr_ver':version,'trgr_id':chk_id,'trgr_pid':99999,'trgr_nm':nm,'trgr_col1':col1,'trgr_col2':col2,'trgr_memuid':login_uid,'trgr_regdate':updatetime};
		}else{ //자식일 경우
			console.log('자식');
			var chk_id = s;
			var chk_pid = chk_obj[state[s].parent]; //체크용 객체 key값을 통해 찾은 row번호를 puid에 배정
			var nm = state[s].trgr_nm;
			var col1 = state[s].trgr_col1;
			var col2 = state[s].trgr_col2;
			var memuid = login_uid;
			var regdate = updatetime;
			chk_obj[state[s].id] = chk_id;
			col_info = {'trgr_ver':version,'trgr_id':chk_id,'trgr_pid':chk_pid,'trgr_nm':nm,'trgr_col1':col1,'trgr_col2':col2,'trgr_memuid':login_uid,'trgr_regdate':updatetime};
		}
		data_info.column.push(col_info);
	}
	data.push(data_info);
	console.log(data);
	var insert_chk = insert_common(data);	
	console.log(insert_chk);
	if(insert_chk.result == 'success'){
		alert('저장이 완료되었습니다.');
		location.reload(true);
	}else{
		alert('저장과정에서 문제가 발생하였습니다. 관리자에게 문의해 주세요.');
	}
}

//최신버전 셀렉트 옵션
var tree_data = call_data('tree_grid','Max(trgr_ver) AS ver');
var latest_ver = tree_data.data.tree_grid[0].ver;
var rows = [
	{
		name: 'select',
		type: 'select',
		label: 'Ver',
		labelPosition: 'left',
		labelWidth: 300,
		value: Number(latest_ver),
		required: true,
		options: [
		]
	}
];

//버전 선택시 그리드 변경
function select_change(){
	var value = $("#form option:selected").val();
	var load_data = call_data('tree_grid','trgr_id AS id, trgr_pid as parent, trgr_nm, trgr_col1, trgr_col2, trgr_memuid, trgr_regdate','trgr_ver','=',value);
	var data_box = load_data.data.tree_grid
	for(i = 0; i < data_box.length; i++){ //parent값이 99999면 객체값 날리기
		var pid_chk = data_box[i].parent;
		if(pid_chk == '99999'){
			delete data_box[i].parent;
		}
	}
	dataset = data_box;
	//트리그리드 실행
	treegrid.data.parse(dataset);
}

//전부 펼치기
function expandAll() {
    treegrid.expandAll();
}

//전부 접기
function collapseAll() {
    treegrid.collapseAll();
}